// POST /api/baoya-exam  { action: 'verify-purchase' | 'start-exam' | 'complete-exam', ... }
// Hobby 플랜 함수 개수(12) 제한 + 동적 라우트가 vercel.json 재작성과 충돌하는 문제 때문에,
// 바오야 결제 3종을 리터럴 단일 함수로 통합하고 body의 action 으로 분기한다.
import { google } from 'googleapis';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyBaoyaToken, baoyaDb } from './baoya/_baoya-admin.js';

const PACKAGE_NAME = process.env.BAOYA_ANDROID_PACKAGE_NAME || 'com.baoya.tsc';

const KNOWN_PRODUCT_IDS = new Set([
  'tsc_basic',
  'tsc_mini_plus',
  'tsc_mini_pro',
  'tsc_mock_exam',
]);

const RESUME_WINDOW_MS = 3 * 60 * 60 * 1000;

let _publisher;
function androidPublisher() {
  if (_publisher) return _publisher;
  const clientEmail =
    process.env.BAOYA_GOOGLE_PLAY_SA_CLIENT_EMAIL || process.env.BAOYA_FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.BAOYA_GOOGLE_PLAY_SA_PRIVATE_KEY || process.env.BAOYA_FIREBASE_PRIVATE_KEY || ''
  ).replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  _publisher = google.androidpublisher({ version: 'v3', auth });
  return _publisher;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const action = (req.body || {}).action;

  let uid;
  try {
    uid = await verifyBaoyaToken(req);
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  if (action === 'verify-purchase') return verifyPurchase(req, res, uid);
  if (action === 'start-exam') return startExam(req, res, uid);
  if (action === 'complete-exam') return completeExam(req, res, uid);
  return res.status(404).json({ ok: false, error: '알 수 없는 요청입니다.' });
}

// ── 구매 검증 → 수량만큼 충전(멱등) ──────────────────────────────
async function verifyPurchase(req, res, uid) {
  const { productId, purchaseToken } = req.body || {};
  if (!purchaseToken || typeof purchaseToken !== 'string') {
    return res.status(400).json({ ok: false, error: 'purchaseToken이 필요합니다.' });
  }
  if (!productId || !KNOWN_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 상품입니다.' });
  }

  let purchase;
  try {
    const r = await androidPublisher().purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });
    purchase = r.data;
  } catch (err) {
    console.error('[baoya verify-purchase] Play API 오류:', err?.message);
    return res.status(400).json({ ok: false, error: '구매를 확인할 수 없습니다.' });
  }

  if (purchase.purchaseState !== 0) {
    return res.status(200).json({ ok: true, credited: 0, state: purchase.purchaseState });
  }
  const quantity = Number.isInteger(purchase.quantity) && purchase.quantity > 0 ? purchase.quantity : 1;

  const db = baoyaDb();
  const tokenId = createHash('sha256').update(purchaseToken).digest('hex');
  const tokRef = db.collection('baoya_purchase_tokens').doc(tokenId);
  const userRef = db.collection('users').doc(uid);
  let credited = quantity;
  try {
    await db.runTransaction(async (tx) => {
      const tok = await tx.get(tokRef);
      if (tok.exists) {
        credited = 0;
        return;
      }
      tx.set(
        userRef,
        { credits: { [productId]: FieldValue.increment(quantity) }, updatedAt: new Date() },
        { merge: true },
      );
      tx.set(tokRef, { uid, productId, quantity, processedAt: new Date() });
    });
  } catch (e) {
    console.error('[baoya verify-purchase] 충전 트랜잭션 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '충전 처리 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ ok: true, credited, productId, quantity });
}

// ── 시험 시작 → 1회 차감(또는 진행중 세션 재개) ───────────────────
async function startExam(req, res, uid) {
  const { productId } = req.body || {};
  if (!productId || !KNOWN_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 상품입니다.' });
  }

  const db = baoyaDb();
  const userRef = db.collection('users').doc(uid);
  const sessionsRef = userRef.collection('exam_sessions');

  const cutoff = Date.now() - RESUME_WINDOW_MS;
  const inProgSnap = await sessionsRef
    .where('productId', '==', productId)
    .where('status', '==', 'in_progress')
    .get();
  let resumeDoc = null;
  let resumeTs = 0;
  inProgSnap.forEach((d) => {
    const st = d.get('startedAt');
    const ms = st?.toMillis ? st.toMillis() : st ? new Date(st).getTime() : 0;
    if (ms >= cutoff && ms >= resumeTs) {
      resumeTs = ms;
      resumeDoc = d;
    }
  });
  if (resumeDoc) {
    const userSnap = await userRef.get();
    const remaining = userSnap.exists ? (userSnap.data().credits?.[productId] ?? 0) : 0;
    return res.status(200).json({ ok: true, sessionId: resumeDoc.id, resumed: true, remaining });
  }

  const newSessionRef = sessionsRef.doc();
  let remaining = 0;
  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const current = userSnap.exists ? (userSnap.data().credits?.[productId] ?? 0) : 0;
      if (current < 1) {
        const err = new Error('insufficient');
        err.code = 'INSUFFICIENT';
        throw err;
      }
      tx.set(
        userRef,
        { credits: { [productId]: FieldValue.increment(-1) }, updatedAt: new Date() },
        { merge: true },
      );
      tx.set(newSessionRef, { productId, status: 'in_progress', startedAt: new Date() });
      remaining = current - 1;
    });
  } catch (e) {
    if (e.code === 'INSUFFICIENT') {
      return res.status(402).json({ ok: false, error: 'insufficient', remaining: 0 });
    }
    console.error('[baoya start-exam] 차감 트랜잭션 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '시작 처리 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ ok: true, sessionId: newSessionRef.id, resumed: false, remaining });
}

// ── 시험 완료 → 세션 닫기 ────────────────────────────────────────
async function completeExam(req, res, uid) {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ ok: false, error: 'sessionId가 필요합니다.' });
  }
  try {
    await baoyaDb()
      .collection('users')
      .doc(uid)
      .collection('exam_sessions')
      .doc(sessionId)
      .set({ status: 'completed', completedAt: new Date() }, { merge: true });
  } catch (e) {
    console.error('[baoya complete-exam] 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '완료 처리 중 오류가 발생했습니다.' });
  }
  return res.status(200).json({ ok: true });
}

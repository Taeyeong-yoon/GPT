// POST /api/sjpt/verify-purchase
// 이누짱(SJPT) 소비성 인앱상품(응시권) 구매를 서버에서 검증하고,
// 유효하면 구매 수량(quantity)만큼 Firestore 원장(users/{uid}.credits)에 충전한다.
//
// 진실의 원천 = Google Play Developer API(purchases.products.get).
// 클라이언트는 횟수를 직접 못 쓰고(보안규칙 write:false), 이 함수만 admin으로 충전한다.
// 멱등: 같은 구매토큰이 여러 번 와도 1번만 충전(sjpt_purchase_tokens 인덱스).
import { google } from 'googleapis';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySjptToken, sjptDb } from './_sjpt-admin.js';

const PACKAGE_NAME = process.env.SJPT_ANDROID_PACKAGE_NAME || 'com.inuchan.sjpt';

// package_model.dart 의 productId 와 일치해야 한다.
const KNOWN_PRODUCT_IDS = new Set([
  'sjpt_basic', // 미니 기본권 (Play에서 sjpt_mini_basic 삭제→재사용 불가라 sjpt_basic 사용)
  'sjpt_mini_plus',
  'sjpt_mini_pro',
  'sjpt_mock_exam',
]);

let _publisher;
function androidPublisher() {
  if (_publisher) return _publisher;
  // 전용 SA 있으면 사용, 없으면 SJPT Admin SA 재사용(=Play Console에 권한 부여된 그 SA)
  const clientEmail =
    process.env.SJPT_GOOGLE_PLAY_SA_CLIENT_EMAIL || process.env.SJPT_FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.SJPT_GOOGLE_PLAY_SA_PRIVATE_KEY || process.env.SJPT_FIREBASE_PRIVATE_KEY || ''
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

  // 1) 신원
  let uid;
  try {
    uid = await verifySjptToken(req);
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  // 2) 입력
  const { productId, purchaseToken } = req.body || {};
  if (!purchaseToken || typeof purchaseToken !== 'string') {
    return res.status(400).json({ ok: false, error: 'purchaseToken이 필요합니다.' });
  }
  if (!productId || !KNOWN_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 상품입니다.' });
  }

  // 3) 구글 플레이로 구매 진위/수량 검증
  let purchase;
  try {
    const r = await androidPublisher().purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });
    purchase = r.data;
  } catch (err) {
    console.error('[sjpt verify-purchase] Play API 오류:', err?.message);
    return res.status(400).json({ ok: false, error: '구매를 확인할 수 없습니다.' });
  }

  // purchaseState: 0=구매완료, 1=취소, 2=대기
  if (purchase.purchaseState !== 0) {
    return res.status(200).json({ ok: true, credited: 0, state: purchase.purchaseState });
  }
  const quantity = Number.isInteger(purchase.quantity) && purchase.quantity > 0 ? purchase.quantity : 1;

  // 4) 멱등 충전 (트랜잭션)
  const db = sjptDb();
  const tokenId = createHash('sha256').update(purchaseToken).digest('hex');
  const tokRef = db.collection('sjpt_purchase_tokens').doc(tokenId);
  const userRef = db.collection('users').doc(uid);
  let credited = quantity;
  try {
    await db.runTransaction(async (tx) => {
      const tok = await tx.get(tokRef);
      if (tok.exists) {
        credited = 0; // 이미 처리된 토큰 → 중복 충전 방지
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
    console.error('[sjpt verify-purchase] 충전 트랜잭션 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '충전 처리 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ ok: true, credited, productId, quantity });
}

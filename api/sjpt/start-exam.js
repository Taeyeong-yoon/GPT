// POST /api/sjpt/start-exam
// 시험 시작 시 응시권 1회를 **서버에서** 차감한다(악용 방지: 화면 나가도 이미 차감됨).
// 단, 사고로 나간 경우를 위해 진행중(in_progress) 세션이 있으면 같은 시도를 재개(추가 차감 없음).
//
// 요청:  { productId }   (Authorization: Bearer <sjpt IDToken>)
// 응답:  { ok, sessionId, resumed, remaining }
//        잔여 없음 → 402 { ok:false, error:'insufficient', remaining:0 }
import { FieldValue } from 'firebase-admin/firestore';
import { verifySjptToken, sjptDb } from './_sjpt-admin.js';

const KNOWN_PRODUCT_IDS = new Set([
  'sjpt_basic', // 미니 기본권 (Play에서 sjpt_mini_basic 삭제→재사용 불가라 sjpt_basic 사용)
  'sjpt_mini_plus',
  'sjpt_mini_pro',
  'sjpt_mock_exam',
]);

// 사고 이탈 후 재개 허용 시간(이 시간 내 같은 상품 진행중 세션은 재개, 추가 차감 없음)
const RESUME_WINDOW_MS = 3 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let uid;
  try {
    uid = await verifySjptToken(req);
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  const { productId } = req.body || {};
  if (!productId || !KNOWN_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 상품입니다.' });
  }

  const db = sjptDb();
  const userRef = db.collection('users').doc(uid);
  const sessionsRef = userRef.collection('exam_sessions');

  // 1) 재개 가능한 진행중 세션 확인 (추가 차감 없음)
  //    startedAt 컷오프·정렬은 코드에서 처리 → Firestore 복합색인 불필요(equality 2개만 쿼리).
  //    (진행중 세션은 상품당 소수라 클라이언트 정렬 부담 없음)
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

  // 2) 신규 시작 → 트랜잭션으로 1회 차감 + 세션 생성
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
      tx.set(newSessionRef, {
        productId,
        status: 'in_progress',
        startedAt: new Date(),
      });
      remaining = current - 1;
    });
  } catch (e) {
    if (e.code === 'INSUFFICIENT') {
      return res.status(402).json({ ok: false, error: 'insufficient', remaining: 0 });
    }
    console.error('[sjpt start-exam] 차감 트랜잭션 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '시작 처리 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ ok: true, sessionId: newSessionRef.id, resumed: false, remaining });
}

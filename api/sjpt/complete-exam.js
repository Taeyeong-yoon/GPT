// POST /api/sjpt/complete-exam
// 시험 제출(완료) 시 세션을 닫는다 → 완료된 시도는 더 이상 무료 재개되지 않음.
// 요청: { sessionId }  (Authorization: Bearer <sjpt IDToken>)
import { verifySjptToken, sjptDb } from './_sjpt-admin.js';

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

  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ ok: false, error: 'sessionId가 필요합니다.' });
  }

  try {
    await sjptDb()
      .collection('users')
      .doc(uid)
      .collection('exam_sessions')
      .doc(sessionId)
      .set({ status: 'completed', completedAt: new Date() }, { merge: true });
  } catch (e) {
    console.error('[sjpt complete-exam] 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '완료 처리 중 오류가 발생했습니다.' });
  }
  return res.status(200).json({ ok: true });
}

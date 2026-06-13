// GET /api/subscription — 구독 상태 조회
// LAUNCH_PROMO_ACTIVE=true 이면 모든 유저에게 Pro 반환 (출시 이벤트 기간)
import { verifyToken, db } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let uid;
  try {
    uid = await verifyToken(req);
  } catch {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // 출시 이벤트 기간: 전원 Pro 무료 제공
  if (process.env.LAUNCH_PROMO_ACTIVE === 'true') {
    return res.status(200).json({
      isPro: true,
      isPromo: true,
      plan: 'promo',
      message: '출시 이벤트 기간 — 전 기능 무료 이용 중',
    });
  }

  try {
    const snap = await db().collection('subscriptions')
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(200).json({ isPro: false, plan: 'free', subscription: null });
    }

    const sub = snap.docs[0].data();
    const expired = sub.expiresAt ? sub.expiresAt.toDate() < new Date() : false;

    if (expired) {
      await snap.docs[0].ref.update({ status: 'expired', updatedAt: new Date() });
      return res.status(200).json({ isPro: false, plan: 'free', subscription: null });
    }

    return res.status(200).json({
      isPro: true,
      plan: sub.plan,
      subscription: {
        plan: sub.plan,
        status: sub.status,
        expiresAt: sub.expiresAt?.toDate?.()?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[Subscription]', err.message);
    return res.status(500).json({ error: '구독 정보를 불러올 수 없습니다.' });
  }
}

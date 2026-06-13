// POST /api/create-checkout — Stripe 결제 세션 생성
import Stripe from 'stripe';
import { verifyToken, db } from './_admin.js';

const PLANS = {
  monthly: { label: '프로 월간', priceId: () => process.env.STRIPE_PRICE_ID_MONTHLY },
  yearly:  { label: '프로 연간', priceId: () => process.env.STRIPE_PRICE_ID_YEARLY  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let uid;
  try {
    uid = await verifyToken(req);
  } catch {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const { plan } = req.body || {};
  const planData = PLANS[plan];
  if (!planData || !planData.priceId()) {
    return res.status(400).json({ error: '유효하지 않은 플랜입니다.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.origin || 'https://ai-opic.com';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      client_reference_id: uid,
      line_items: [{ price: planData.priceId(), quantity: 1 }],
      metadata: { uid, plan },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/pricing`,
      allow_promotion_codes: true,
      locale: 'ko',
    });

    await db().collection('subscriptions').add({
      uid, plan, status: 'pending',
      sessionId: session.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[Checkout]', err.message);
    return res.status(500).json({ error: '결제 세션 생성에 실패했습니다.' });
  }
}

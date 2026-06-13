// POST /api/webhook — Stripe 웹훅 처리 → Firestore 구독 상태 업데이트
import Stripe from 'stripe';
import { getAdminApp, db } from './_admin.js';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] 서명 검증 실패:', err.message);
    return res.status(400).json({ error: err.message });
  }

  const firestore = db();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { uid, plan } = session.metadata || {};
        if (!uid) break;

        const snap = await firestore.collection('subscriptions')
          .where('sessionId', '==', session.id).limit(1).get();
        if (snap.empty) break;

        const stripeSub = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription)
          : null;
        const expiresAt = stripeSub?.current_period_end
          ? new Date(stripeSub.current_period_end * 1000)
          : _addPeriod(new Date(), plan);

        await snap.docs[0].ref.update({
          status: 'active',
          subscriptionId: session.subscription,
          customerId: session.customer,
          expiresAt,
          updatedAt: new Date(),
        });

        // 사용자 문서에도 구독 정보 동기화
        await firestore.collection('users').doc(uid).set(
          { subscription: { plan, status: 'active', expiresAt } },
          { merge: true }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const snap = await firestore.collection('subscriptions')
          .where('subscriptionId', '==', sub.id).limit(1).get();
        if (snap.empty) break;

        const STATUS = { active: 'active', trialing: 'active', past_due: 'past_due', canceled: 'canceled', unpaid: 'inactive' };
        const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
        const status = STATUS[sub.status] || 'unknown';

        await snap.docs[0].ref.update({ status, expiresAt, updatedAt: new Date() });

        const { uid } = snap.docs[0].data();
        if (uid) {
          await firestore.collection('users').doc(uid).set(
            { subscription: { status, expiresAt } },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const snap = await firestore.collection('subscriptions')
          .where('subscriptionId', '==', sub.id).limit(1).get();
        if (snap.empty) break;

        await snap.docs[0].ref.update({ status: 'canceled', updatedAt: new Date() });

        const { uid } = snap.docs[0].data();
        if (uid) {
          await firestore.collection('users').doc(uid).set(
            { subscription: { status: 'canceled' } },
            { merge: true }
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const snap = await firestore.collection('subscriptions')
          .where('subscriptionId', '==', invoice.subscription).limit(1).get();
        if (snap.empty) break;

        const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
        const expiresAt = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000) : null;

        await snap.docs[0].ref.update({ status: 'active', expiresAt, updatedAt: new Date() });

        const { uid } = snap.docs[0].data();
        if (uid) {
          await firestore.collection('users').doc(uid).set(
            { subscription: { status: 'active', expiresAt } },
            { merge: true }
          );
          await firestore.collection('logs').add({
            type: 'payment', uid,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            timestamp: new Date(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const snap = await firestore.collection('subscriptions')
          .where('subscriptionId', '==', invoice.subscription).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ status: 'past_due', updatedAt: new Date() });
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Webhook] 처리 오류:', err.message);
  }

  return res.status(200).json({ received: true });
}

function _addPeriod(date, plan) {
  const d = new Date(date);
  if (plan === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

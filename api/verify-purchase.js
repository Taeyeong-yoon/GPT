// POST /api/verify-purchase
// 네코짱 JLPT 앱의 구글 플레이 구독 구매를 서버에서 검증하고,
// 유효하면 Firestore users/{uid}.plan = PREMIUM 을 기록한다.
//
// 진실의 원천(Source of Truth) = Google Play Developer API.
// 클라이언트(앱)는 Firestore 보안규칙(users/{uid}: allow write:false) 때문에
// plan 을 직접 쓸 수 없다. 그래서 구매 토큰을 이 함수로 보내 검증받고,
// 이 함수가 firebase-admin(규칙 우회)으로 plan 을 기록한다.
//
// 보안 포인트:
// 1. 신원: Firebase ID Token 으로 uid 확인 (남의 계정에 권한 못 줌).
// 2. 진위: 구매 토큰을 구글 플레이로 직접 검증 (위조 토큰 차단).
// 3. 상품: 우리 구독 상품 ID 인지 확인.
// 4. 멱등: 같은 토큰이 여러 번 와도 안전 (set merge).
import { google } from 'googleapis';
import { verifyToken, db } from './_admin.js';

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.nekochan.jlpt';

// billing_config.dart 의 상품 ID 와 일치해야 한다.
const KNOWN_PRODUCT_IDS = new Set([
  'nekochan_premium_monthly',
  'nekochan_premium_yearly',
]);

// 프리미엄 권한을 줄 구독 상태.
// CANCELED = 자동갱신만 꺼진 상태로, 만료 전까지는 접근 유지해야 하므로 포함.
const ACTIVE_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);

let _publisher;
function androidPublisher() {
  if (_publisher) return _publisher;
  // 전용 SA 가 있으면 사용, 없으면 Firebase Admin SA 재사용.
  // (재사용 시 해당 SA 이메일을 Play Console 에서 권한 부여해야 함)
  const clientEmail =
    process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.GOOGLE_PLAY_SA_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || ''
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

  // 1) 신원 확인 (Firebase ID Token → uid)
  let uid;
  try {
    uid = await verifyToken(req);
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  // 2) 입력 검증
  const { purchaseToken, productId } = req.body || {};
  if (!purchaseToken || typeof purchaseToken !== 'string') {
    return res.status(400).json({ ok: false, error: 'purchaseToken이 필요합니다.' });
  }
  if (!productId || !KNOWN_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 상품입니다.' });
  }

  // 3) 구글 플레이로 구독 진위/활성 검증
  let sub;
  try {
    const r = await androidPublisher().purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });
    sub = r.data;
  } catch (err) {
    // 위조/만료/패키지 불일치 토큰 등은 여기로 떨어짐
    console.error('[verify-purchase] Play API 오류:', err?.message);
    return res.status(400).json({ ok: false, error: '구매를 확인할 수 없습니다.' });
  }

  // 4) 상태/상품 판정
  const state = sub.subscriptionState;
  const lineItems = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  const matchedItem = lineItems.find((li) => KNOWN_PRODUCT_IDS.has(li.productId));
  const isActive = ACTIVE_STATES.has(state) && !!matchedItem;

  // 만료시각 (가장 늦은 lineItem 기준)
  let expiryMillis = null;
  for (const li of lineItems) {
    if (li.expiryTime) {
      const t = Date.parse(li.expiryTime);
      if (!Number.isNaN(t)) expiryMillis = Math.max(expiryMillis ?? 0, t);
    }
  }

  // 5) Firestore 에 권한 기록 (admin → 보안규칙 우회)
  const plan = isActive ? 'PREMIUM' : 'FREE';
  const now = new Date();
  await db().collection('users').doc(uid).set(
    {
      plan,
      planUpdatedAt: now,
      planSource: 'google_play',
      planProductId: matchedItem?.productId ?? productId,
      planState: state ?? null,
      planExpiryTime: expiryMillis ? new Date(expiryMillis) : null,
    },
    { merge: true },
  );

  // 6) 토큰→uid 역참조 인덱스 (RTDN 웹훅에서 갱신/만료 통지 시 uid 조회용).
  //    토큰이 길 수 있어 sha256 해시를 문서 ID 로 사용.
  try {
    const { createHash } = await import('node:crypto');
    const tokenId = createHash('sha256').update(purchaseToken).digest('hex');
    await db().collection('play_purchase_tokens').doc(tokenId).set(
      {
        uid,
        productId: matchedItem?.productId ?? productId,
        state: state ?? null,
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (e) {
    console.error('[verify-purchase] 토큰 인덱스 기록 실패(무시):', e?.message);
  }

  return res.status(200).json({
    ok: true,
    plan,
    active: isActive,
    state: state ?? null,
    productId: matchedItem?.productId ?? productId,
    expiryTime: expiryMillis ? new Date(expiryMillis).toISOString() : null,
  });
}

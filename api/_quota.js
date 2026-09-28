// action:'quota' — 응시 횟수 원장(서버 전용). (라우트: /api/app)
//
// 왜 서버로 옮겼나:
//   기존에는 users/{uid}/usage 와 users/{uid}/mini_free 를 클라이언트가 직접
//   증가시켰다. 보안규칙이 그 쓰기를 허용했으므로 브라우저 콘솔에서 카운터를
//   0으로 되돌리면 무료·유료 제한이 그대로 무력화됐다. 또 증가 시점이
//   "시험 제출 후"라서 중간에 새로고침하면 횟수가 소모되지 않았고,
//   Firestore 쓰기가 실패하면 catch 가 증가 자체를 건너뛰었다(fail-open).
//
// 지금 규칙:
//   - 카운터 쓰기는 이 함수만 가능(보안규칙에서 클라이언트 쓰기 차단).
//   - 소모는 "시험 시작" 시점에 트랜잭션으로 확인+증가를 원자적으로 수행.
//   - 한도 초과면 403 으로 거부 → 클라이언트가 시험을 시작하지 못한다.
import { verifyToken, db } from './_admin.js';
import { FieldValue } from 'firebase-admin/firestore';

// 정식 시험 — 무료 제공 없음(Pro 전용). 2026-08-30 정책.
const PRO_MONTHLY_FULL = { jlpt: 2, sjpt: 1 };

// 미니 시험 — 무료는 JLPT 미니 3일 3회만.
const PRO_MONTHLY_MINI = { jlpt: 30, sjpt: 10 };
const FREE_TRIAL_DAYS = 3;
const FREE_TRIAL_COUNT = 3;

const SCOPES = new Set(['jlpt_full', 'sjpt_full', 'jlpt_mini', 'sjpt_mini']);

function monthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 저장된 plan 을 얼마나 오래 믿을지. 이 시간이 지나면 구글에 다시 물어본다.
// 환불/해지(revoke)는 만료일 전에도 일어나는데, 그건 planExpiryTime 으로
// 걸러지지 않는다. 앱을 켜지 않는 사용자는 verify-purchase 가 돌지 않으므로
// 서버가 주기적으로 직접 확인해야 한다.
const PLAN_TRUST_WINDOW_MS = 12 * 60 * 60 * 1000; // 12시간

/// 저장된 구매 토큰으로 구글에 현재 구독 상태를 직접 물어본다.
/// 확인에 성공하면 Firestore 를 최신값으로 갱신하고 활성 여부를 반환한다.
/// 토큰이 없거나 조회에 실패하면 null(판정 불가).
async function revalidateWithGoogle(uid) {
  let tokenDoc;
  try {
    const snap = await db()
      .collection('play_purchase_tokens')
      .where('uid', '==', uid)
      .get();
    if (snap.empty) return null;
    // 가장 최근에 갱신된 토큰 = 현재 구독
    tokenDoc = snap.docs
      .map((d) => d.data())
      .filter((d) => d.purchaseToken)
      .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))[0];
  } catch (e) {
    console.error('[exam-quota] 토큰 조회 실패:', e?.message);
    return null;
  }
  if (!tokenDoc) return null; // 2026-08-30 이전 기록은 원본 토큰이 없다

  let sub;
  try {
    const { google } = await import('googleapis');
    const clientEmail =
      process.env.GOOGLE_PLAY_SA_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (
      process.env.GOOGLE_PLAY_SA_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || ''
    ).replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const publisher = google.androidpublisher({ version: 'v3', auth });
    const r = await publisher.purchases.subscriptionsv2.get({
      packageName: process.env.ANDROID_PACKAGE_NAME || 'com.nekochan.jlpt',
      token: tokenDoc.purchaseToken,
    });
    sub = r.data;
  } catch (e) {
    // 환불·취소된 토큰은 여기서 4xx 가 날 수 있다. 그것도 "비활성"의 신호지만,
    // 일시적 장애와 구분이 안 되므로 판정 불가로 둔다(과회수 방지).
    console.error('[exam-quota] Play 재검증 실패:', e?.message);
    return null;
  }

  const ACTIVE = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    'SUBSCRIPTION_STATE_CANCELED', // 해지했지만 만료 전 → 접근 유지
  ]);
  const state = sub.subscriptionState;
  const items = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  let expiryMillis = null;
  for (const li of items) {
    const t = li.expiryTime ? Date.parse(li.expiryTime) : NaN;
    if (!Number.isNaN(t)) expiryMillis = Math.max(expiryMillis ?? 0, t);
  }
  const active = ACTIVE.has(state) && (!expiryMillis || expiryMillis > Date.now());

  try {
    await db().collection('users').doc(uid).set(
      {
        plan: active ? 'PREMIUM' : 'FREE',
        planState: state ?? null,
        planUpdatedAt: new Date(),
        planExpiryTime: expiryMillis ? new Date(expiryMillis) : null,
        planSource: 'google_play',
      },
      { merge: true },
    );
  } catch (e) {
    console.error('[exam-quota] 재검증 결과 기록 실패:', e?.message);
  }
  return active;
}

/// 구독 여부 판정 — 앱 인앱결제(users.plan) 우선, 없으면 웹 구독 원장.
/// 클라이언트가 보낸 isPro 를 절대 믿지 않는다.
async function resolveIsPro(uid) {
  // 1) 앱 인앱결제 — 주 경로. 여기서 실패하면 판정 자체를 포기한다(503).
  const userSnap = await db().collection('users').doc(uid).get();
  if (userSnap.exists) {
    const d = userSnap.data() ?? {};
    const plan = String(d.plan ?? '').replace(/"/g, '').toUpperCase();
    if (plan === 'PREMIUM') {
      const expiresAt = d.planExpiryTime?.toDate?.() ?? null;
      const checkedAt = d.planUpdatedAt?.toDate?.() ?? null;
      const stale =
        !checkedAt || Date.now() - checkedAt.getTime() > PLAN_TRUST_WINDOW_MS;

      // 기록이 오래됐으면 구글에 직접 물어본다.
      // 환불·강제취소는 만료일이 남아 있어도 권한을 잃어야 하는데,
      // 저장값만 보면 만료일까지 프리미엄이 유지되는 구멍이 생긴다.
      if (stale) {
        const fresh = await revalidateWithGoogle(uid);
        if (fresh !== null) return fresh;
        // 확인 불가 시엔 기존 판정으로 폴백(정상 구독자 과회수 방지)
      }

      if (!expiresAt || expiresAt > new Date()) return true;
    }
  }

  // 2) 웹 직접결제 — 보조 경로.
  //    복합 인덱스(uid, status, createdAt)가 필요하다. 인덱스가 빠지면
  //    FAILED_PRECONDITION 이 나는데, 그때 전체를 503 으로 죽이면 앱 결제
  //    사용자까지 시험을 못 본다. 여기서는 "웹 구독 없음"으로 넘기고
  //    로그를 크게 남긴다(인덱스 누락은 배포로 고칠 문제).
  try {
    const subs = await db()
      .collection('subscriptions')
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (subs.empty) return false;

    const expiresAt = subs.docs[0].data()?.expiresAt?.toDate?.() ?? null;
    return !expiresAt || expiresAt > new Date();
  } catch (e) {
    console.error('[exam-quota] subscriptions 조회 실패 — 인덱스 확인 필요:', e?.message);
    return false;
  }
}

/// 무료 체험(3일 3회) 상태 계산.
function evaluateFreeTrial(freeData, kind) {
  const startedAt = freeData?.[`${kind}_trial_started_at`];
  const used = Number(freeData?.[`${kind}_trial_used`]) || 0;

  if (!startedAt) {
    return { allowed: true, used: 0, limit: FREE_TRIAL_COUNT, fresh: true };
  }
  const daysPassed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000);
  if (daysPassed >= FREE_TRIAL_DAYS) {
    return { allowed: false, reason: 'trial_expired', used, limit: FREE_TRIAL_COUNT };
  }
  if (used >= FREE_TRIAL_COUNT) {
    return { allowed: false, reason: 'trial_count', used, limit: FREE_TRIAL_COUNT };
  }
  return { allowed: true, used, limit: FREE_TRIAL_COUNT };
}

export async function handleQuota(req, res) {
  let uid;
  try {
    uid = await verifyToken(req);
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  // 라우트 분기용 action 과 겹치지 않도록 원장 동작은 mode 로 받는다.
  const { scope, mode = 'check' } = req.body || {};
  if (!SCOPES.has(scope)) {
    return res.status(400).json({ ok: false, error: '알 수 없는 scope 입니다.' });
  }
  if (mode !== 'check' && mode !== 'consume') {
    return res.status(400).json({ ok: false, error: '알 수 없는 mode 입니다.' });
  }

  const [kind, tier] = scope.split('_'); // 'jlpt'|'sjpt', 'full'|'mini'

  let isPro;
  try {
    isPro = await resolveIsPro(uid);
  } catch (e) {
    console.error('[exam-quota] 구독 조회 실패:', e?.message);
    // 조회가 안 되면 허용하지 않는다(fail-closed). 무료 무제한 우회 방지.
    return res.status(503).json({ ok: false, error: '구독 상태를 확인하지 못했습니다.' });
  }

  const usageRef = db().collection('users').doc(uid).collection('usage').doc(monthKey());
  const freeRef = db().collection('users').doc(uid).collection('mini_free').doc('quota');

  // 필드명은 기존 데이터와 호환 유지.
  //   정식: usage.jlpt / usage.sjpt          , mini_free.jlpt_full
  //   미니: usage.jlpt_mini / usage.sjpt_mini, mini_free.{kind}_trial_*
  const usageField = tier === 'full' ? kind : `${kind}_mini`;
  const proLimit = tier === 'full' ? PRO_MONTHLY_FULL[kind] : PRO_MONTHLY_MINI[kind];

  try {
    const result = await db().runTransaction(async (tx) => {
      const [usageSnap, freeSnap] = await Promise.all([tx.get(usageRef), tx.get(freeRef)]);
      const usage = usageSnap.exists ? usageSnap.data() : {};
      const free = freeSnap.exists ? freeSnap.data() : {};

      // ── 유료 회원: 월 한도 ──────────────────────────────────
      if (isPro) {
        const used = Number(usage?.[usageField]) || 0;
        if (used >= proLimit) {
          return { allowed: false, reason: 'monthly', isPro, used, limit: proLimit };
        }
        if (mode === 'consume') {
          tx.set(usageRef, { [usageField]: FieldValue.increment(1) }, { merge: true });
        }
        return {
          allowed: true,
          isPro,
          used: mode === 'consume' ? used + 1 : used,
          limit: proLimit,
        };
      }

      // ── 무료 회원 · 정식 시험 — JLPT/SJPT 모두 Pro 전용 ─────
      // (2026-08-30 정책 확정: 무료는 "JLPT 미니 3일 3회"만 제공.
      //  예전의 JLPT 정식 평생 1회 무료는 폐지.)
      if (tier === 'full') {
        return { allowed: false, reason: 'pro_only', isPro, used: 0, limit: 0 };
      }

      // ── 무료 회원 · 미니 시험 ───────────────────────────────
      // SJPT 미니도 Pro 전용. 무료 체험(3일 3회)은 JLPT 미니만 남긴다.
      if (kind === 'sjpt') {
        return { allowed: false, reason: 'pro_only', isPro, used: 0, limit: 0 };
      }
      const trial = evaluateFreeTrial(free, kind);
      if (!trial.allowed) {
        return { allowed: false, reason: trial.reason, isPro, used: trial.used, limit: trial.limit };
      }
      if (mode === 'consume') {
        const patch = { [`${kind}_trial_used`]: FieldValue.increment(1) };
        if (trial.fresh) {
          patch[`${kind}_trial_started_at`] = new Date().toISOString();
        }
        tx.set(freeRef, patch, { merge: true });
      }
      return {
        allowed: true,
        isPro,
        used: mode === 'consume' ? trial.used + 1 : trial.used,
        limit: trial.limit,
      };
    });

    if (!result.allowed && mode === 'consume') {
      return res.status(403).json({ ok: false, ...result });
    }
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('[exam-quota] 트랜잭션 실패:', e?.message);
    return res.status(503).json({ ok: false, error: '횟수를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}

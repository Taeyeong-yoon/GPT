// POST /api/sjpt/claim-welcome
// 테스터 설치 지원용 **무료 미니 응시권 지급**.
// 미니 3종(기본 1,300 / 플러스 2,000 / 프로 3,000)만 2장씩. 모의 정상시험(7,500)은 제외.
//
// 요청:  {}  (Authorization: Bearer <sjpt IDToken>)
// 응답:  { ok:true, granted:true,  items:{...}, credits:{...} }   최초 1회
//        { ok:true, granted:false, reason:'already'|'disabled'|'not_tester' }
//
// ⚠️ 계정(uid)당 1회다 — 재설치해도 같은 구글 계정이면 다시 안 나간다.
// ⚠️ 테스트가 끝나면 Vercel 환경변수 SJPT_WELCOME_GRANT 를 off 로 바꾸고 재배포할 것.
//    (켜둔 채 정식 출시하면 신규 가입자 전원에게 6회분 AI 채점 비용이 나간다)
import { FieldValue } from 'firebase-admin/firestore';
import { verifySjptTokenDecoded, sjptDb } from './_sjpt-admin.js';

// 지급 내역 — 미니 3종 한정, 각 2장
const GRANT = {
  sjpt_basic: 2, // 미니 기본권 1,300원 (Play 상품 ID는 sjpt_basic)
  sjpt_mini_plus: 2, // 미니 플러스권 2,000원
  sjpt_mini_pro: 2, // 미니 프로권 3,000원
};

// 지급 버전 — 나중에 다시 한 번 뿌리고 싶으면 이 값을 올린다(기존 수령자도 1회 더 받음)
const GRANT_VERSION = 1;

function grantEnabled() {
  const v = String(process.env.SJPT_WELCOME_GRANT ?? '').trim().toLowerCase();
  return v === 'on' || v === '1' || v === 'true' || v === 'yes';
}

// SJPT_WELCOME_EMAILS 가 설정돼 있으면 그 이메일만 지급(콤마 구분). 비어있으면 로그인한 전원.
function emailAllowed(email) {
  const raw = String(process.env.SJPT_WELCOME_EMAILS ?? '').trim();
  if (!raw) return true;
  const allow = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(String(email ?? '').toLowerCase());
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!grantEnabled()) {
    return res.status(200).json({ ok: true, granted: false, reason: 'disabled' });
  }

  let uid;
  let email;
  try {
    const decoded = await verifySjptTokenDecoded(req);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return res.status(401).json({ ok: false, error: '인증이 필요합니다.' });
  }

  if (!emailAllowed(email)) {
    return res.status(200).json({ ok: true, granted: false, reason: 'not_tester' });
  }

  const db = sjptDb();
  const userRef = db.collection('users').doc(uid);

  let granted = false;
  let credits = {};
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() : {};
      // 이미 이 버전을 받았으면 아무것도 하지 않는다(멱등 — 앱이 켤 때마다 불러도 안전)
      if ((data.welcomeGrant?.v ?? 0) >= GRANT_VERSION) {
        credits = data.credits ?? {};
        return;
      }
      const inc = {};
      for (const [pid, n] of Object.entries(GRANT)) inc[pid] = FieldValue.increment(n);
      tx.set(
        userRef,
        {
          credits: inc,
          welcomeGrant: { v: GRANT_VERSION, items: GRANT, at: new Date() },
          updatedAt: new Date(),
        },
        { merge: true },
      );
      granted = true;
      const before = data.credits ?? {};
      credits = { ...before };
      for (const [pid, n] of Object.entries(GRANT)) credits[pid] = (before[pid] ?? 0) + n;
    });
  } catch (e) {
    console.error('[sjpt claim-welcome] 지급 트랜잭션 오류:', e?.message);
    return res.status(500).json({ ok: false, error: '지급 처리 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({
    ok: true,
    granted,
    reason: granted ? undefined : 'already',
    items: granted ? GRANT : undefined,
    credits,
  });
}

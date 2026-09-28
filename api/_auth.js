// 공용 인증 헬퍼 — 유료 API(OpenAI/Google) 앞단 보호용.
//
// 이 저장소의 Vercel Functions 는 서로 다른 Firebase 프로젝트를 쓰는
// 세 클라이언트가 함께 호출한다:
//   - 네코짱 JLPT 앱/웹 : necojjangski   (FIREBASE_*)
//   - 이누짱 SJPT 앱     : sjpt-aea31     (SJPT_FIREBASE_*)
//   - 바오야 TSC 앱      : baoya          (BAOYA_FIREBASE_*)
//
// gpt-feedback / stt / tts / *-questions 는 세 클라이언트가 모두 쓰므로
// 어느 프로젝트의 ID Token 이든 유효하면 통과시킨다(다중 발급자 허용).
// 권한(구독·횟수) 판정이 필요한 엔드포인트는 여기서 통과시킨 뒤
// 각자의 admin 헬퍼로 별도 확인할 것.
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './_admin.js';

// 프로젝트별 검증기. 환경변수가 없는 프로젝트는 자동으로 건너뛴다.
const ISSUERS = [
  {
    name: 'jlpt',
    ready: () => !!process.env.FIREBASE_PROJECT_ID,
    auth: () => getAuth(getAdminApp()),
  },
  {
    name: 'sjpt',
    ready: () => !!process.env.SJPT_FIREBASE_PROJECT_ID,
    auth: async () => {
      const { sjptAuth } = await import('./sjpt/_sjpt-admin.js');
      return sjptAuth();
    },
  },
  {
    name: 'baoya',
    ready: () => !!process.env.BAOYA_FIREBASE_PROJECT_ID,
    auth: async () => {
      const { baoyaAuth } = await import('./baoya/_baoya-admin.js');
      return baoyaAuth();
    },
  },
];

export function bearerToken(req) {
  const raw = req.headers?.authorization || '';
  if (!raw.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  return token || null;
}

/// 세 프로젝트 중 하나라도 검증에 성공하면 { uid, issuer } 반환.
/// 실패 시 Error('401') 를 던진다.
export async function verifyAnyToken(req) {
  const token = bearerToken(req);
  if (!token) throw new Error('401');

  for (const issuer of ISSUERS) {
    if (!issuer.ready()) continue;
    try {
      const auth = await issuer.auth();
      const decoded = await auth.verifyIdToken(token);
      return { uid: decoded.uid, issuer: issuer.name };
    } catch {
      // 다음 발급자로 계속 — 마지막까지 실패하면 아래에서 401.
    }
  }
  throw new Error('401');
}

/// 핸들러 도입부에서 한 줄로 쓰는 가드.
/// 인증 실패 시 401 응답을 직접 보내고 null 을 반환한다.
///
///   const caller = await requireAuth(req, res);
///   if (!caller) return;
export async function requireAuth(req, res) {
  try {
    return await verifyAnyToken(req);
  } catch {
    res.status(401).json({
      ok: false,
      error: { code: 401, message: '인증이 필요합니다.' },
    });
    return null;
  }
}

// 인증이 필요한 자체 API(/api/*) 호출용 fetch 래퍼.
//
// gpt-feedback / stt / tts / *-questions 는 서버에서 Firebase ID Token 을
// 요구한다(무인증 크레딧 소모 차단). 로그인 상태의 토큰을 자동으로 붙인다.
import { auth } from './firebase';

/// 현재 로그인 사용자의 ID Token 을 담은 헤더를 만든다.
/// 미로그인/발급 실패 시에는 헤더 없이 그대로 진행(서버가 401 로 응답).
export async function authHeaders(base = {}) {
  const user = auth?.currentUser;
  if (!user) return base;
  try {
    const token = await user.getIdToken();
    return { ...base, Authorization: `Bearer ${token}` };
  } catch {
    return base;
  }
}

/// 자체 API 전용 fetch. 항상 인증 헤더를 붙인다.
export async function authFetch(url, options = {}) {
  const headers = await authHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
}

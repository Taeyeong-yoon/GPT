// action:'sso' — 네코짱 JLPT 앱 SSO: Firebase ID Token → Custom Token 교환. (라우트: /api/app)
import { getAuth } from 'firebase-admin/auth';
// 공용 헬퍼 사용 — 같은 인스턴스에 SJPT·바오야 앱이 함께 초기화돼 있어도
// getApps()[0] 처럼 엉뚱한 프로젝트를 집지 않도록 JLPT 기본 앱을 명시적으로 쓴다.
import { getAdminApp } from './_admin.js';

export async function handleSso(req, res) {
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ ok: false, error: 'idToken이 필요합니다.' });
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: 'Firebase Admin 환경변수 미설정' });
  }

  try {
    const adminAuth = getAuth(getAdminApp());

    // ID Token 검증 (네코짱 앱에서 발급된 Firebase 토큰)
    const decoded = await adminAuth.verifyIdToken(idToken);

    // 같은 UID로 Custom Token 발급 → 클라이언트에서 signInWithCustomToken 사용
    const customToken = await adminAuth.createCustomToken(decoded.uid, {
      source: 'jlpt_app',
    });

    return res.status(200).json({ ok: true, customToken, uid: decoded.uid });
  } catch (err) {
    console.error('[SSO] 오류:', err.message);
    return res.status(401).json({ ok: false, error: '유효하지 않은 토큰입니다.' });
  }
}

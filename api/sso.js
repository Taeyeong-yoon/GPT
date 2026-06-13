// POST /api/sso — 네코짱 JLPT 앱 SSO: Firebase ID Token → Custom Token 교환
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

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

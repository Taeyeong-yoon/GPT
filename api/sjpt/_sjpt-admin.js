// 이누짱(SJPT) 전용 Firebase Admin — 프로젝트 sjpt-aea31.
// JLPT(necojjangski)와 다른 프로젝트이므로 named app('sjpt')으로 분리 초기화한다.
// 환경변수: SJPT_FIREBASE_PROJECT_ID / SJPT_FIREBASE_CLIENT_EMAIL / SJPT_FIREBASE_PRIVATE_KEY
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const APP_NAME = 'sjpt';

function sjptApp() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(
    {
      credential: cert({
        projectId: process.env.SJPT_FIREBASE_PROJECT_ID,
        clientEmail: process.env.SJPT_FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.SJPT_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    },
    APP_NAME,
  );
}

export async function verifySjptToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('401');
  const decoded = await getAuth(sjptApp()).verifyIdToken(token);
  return decoded.uid;
}

export function sjptDb() {
  return getFirestore(sjptApp());
}

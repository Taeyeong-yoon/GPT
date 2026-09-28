// 바오야(TSC) 전용 Firebase Admin — 바오야 전용 프로젝트.
// 이누짱(sjpt)·JLPT와 다른 프로젝트이므로 named app('baoya')으로 분리 초기화한다.
// 환경변수: BAOYA_FIREBASE_PROJECT_ID / BAOYA_FIREBASE_CLIENT_EMAIL / BAOYA_FIREBASE_PRIVATE_KEY
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const APP_NAME = 'baoya';

function baoyaApp() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(
    {
      credential: cert({
        projectId: process.env.BAOYA_FIREBASE_PROJECT_ID,
        clientEmail: process.env.BAOYA_FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.BAOYA_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    },
    APP_NAME,
  );
}

// 공용 인증 헬퍼(_auth.js)가 다중 발급자 검증에 쓰는 Auth 인스턴스.
export function baoyaAuth() {
  return getAuth(baoyaApp());
}

export async function verifyBaoyaToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('401');
  const decoded = await getAuth(baoyaApp()).verifyIdToken(token);
  return decoded.uid;
}

export function baoyaDb() {
  return getFirestore(baoyaApp());
}

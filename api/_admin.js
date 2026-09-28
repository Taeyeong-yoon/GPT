// Vercel Functions 공용 Firebase Admin 초기화
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminApp() {
  // getApps()[0] 이 아니라 기본 앱을 이름으로 찾는다 — 같은 인스턴스에 SJPT·바오야
  // 이름 붙은 앱이 먼저 초기화돼 있으면 [0]이 엉뚱한 프로젝트가 될 수 있다.
  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('401');
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return decoded.uid;
}

export function db() {
  return getFirestore(getAdminApp());
}

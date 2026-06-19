import {
  collection, query, where, orderBy, limit, getDocs,
  getDoc, doc, setDoc, increment,
} from 'firebase/firestore';
import { db } from './firebase';

export const EXAM_LIMITS    = { jlpt: 2, sjpt: 1 };
export const FREE_JLPT_FULL = 1; // 무료 회원 JLPT 정식시험 평생 횟수

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getSubscriptionStatus(uid) {
  if (!uid || !db) return { isPro: false };
  try {
    // 1) 앱 인앱결제 → users/{uid}.plan == 'PREMIUM' 확인
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const plan = userSnap.data().plan ?? '';
      if (plan.toUpperCase() === 'PREMIUM') {
        return { isPro: true, plan: 'app', source: 'app' };
      }
    }

    // 2) 웹 직접결제 → subscriptions 컬렉션 확인
    const snap = await getDocs(
      query(
        collection(db, 'subscriptions'),
        where('uid', '==', uid),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1),
      )
    );
    if (snap.empty) return { isPro: false };
    const data = snap.docs[0].data();
    const expiresAt = data.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) return { isPro: false };
    return { isPro: true, plan: data.plan ?? 'monthly', expiresAt };
  } catch {
    return { isPro: false };
  }
}

export async function getMonthlyUsage(uid) {
  if (!uid || !db) return { jlpt: 0, sjpt: 0 };
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'usage', monthKey()));
    if (!snap.exists()) return { jlpt: 0, sjpt: 0 };
    const d = snap.data();
    return { jlpt: d.jlpt ?? 0, sjpt: d.sjpt ?? 0 };
  } catch {
    return { jlpt: 0, sjpt: 0 };
  }
}

/** 무료 회원 JLPT 정식시험 평생 사용 횟수 조회 */
export async function getFreeJlptFullUsage(uid) {
  if (!uid || !db) return 0;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'mini_free', 'quota'));
    return snap.exists() ? (snap.data().jlpt_full ?? 0) : 0;
  } catch { return 0; }
}

/** 무료 회원 JLPT 정식시험 완료 후 카운트 증가 */
export async function incrementFreeJlptFullUsage(uid) {
  if (!uid || !db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { jlpt_full: increment(1) }, { merge: true });
  } catch {}
}

export async function incrementUsage(uid, type) {
  if (!uid || !db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'usage', monthKey()),
      { [type]: increment(1) },
      { merge: true },
    );
  } catch {}
}

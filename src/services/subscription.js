import {
  collection, query, where, orderBy, limit, getDocs,
  getDoc, doc, setDoc, increment,
} from 'firebase/firestore';
import { db } from './firebase';

export const EXAM_LIMITS = { jlpt: 3, sjpt: 2 };

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getSubscriptionStatus(uid) {
  if (!uid || !db) return { isPro: false };
  try {
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

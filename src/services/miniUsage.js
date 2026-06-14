import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// 무료 한도 (평생 1회성)
export const FREE_JLPT_TOTAL = 20;   // 레벨 구분 없이 평생 20회
export const FREE_SJPT = 3;           // 평생 3회

// 유료 한도 (월별)
export const PRO_MONTHLY_JLPT = 60;
export const PRO_MONTHLY_SJPT = 10;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

async function getRaw(uid) {
  const [freeSnap, monthSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'mini_free', 'quota')),
    getDoc(doc(db, 'users', uid, 'usage', monthKey())),
  ]);
  return {
    free:  freeSnap.exists()  ? freeSnap.data()  : {},
    month: monthSnap.exists() ? monthSnap.data() : {},
  };
}

/** 미니 시험 접근 가능 여부 반환 */
export async function checkMiniAccess(uid, isPro, type) {
  if (!uid || !db) return { canStart: false, reason: 'login' };
  try {
    const { free, month } = await getRaw(uid);

    if (type === 'jlpt') {
      if (isPro) {
        const monthUsed = month.jlpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_JLPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_JLPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_JLPT };
      } else {
        const lifeUsed = free.jlpt_total ?? 0;
        if (lifeUsed >= FREE_JLPT_TOTAL) return { canStart: false, reason: 'lifetime', used: lifeUsed, limit: FREE_JLPT_TOTAL };
        return { canStart: true, lifeUsed, lifeLimit: FREE_JLPT_TOTAL };
      }
    }

    if (type === 'sjpt') {
      if (isPro) {
        const monthUsed = month.sjpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_SJPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_SJPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_SJPT };
      } else {
        const lifeUsed = free.sjpt ?? 0;
        if (lifeUsed >= FREE_SJPT) return { canStart: false, reason: 'lifetime', used: lifeUsed, limit: FREE_SJPT };
        return { canStart: true, lifeUsed, lifeLimit: FREE_SJPT };
      }
    }
  } catch { return { canStart: true }; }
}

/** 미니 시험 완료 후 카운트 증가 */
export async function incrementMiniUsage(uid, isPro, type) {
  if (!uid || !db) return;
  const month = monthKey();
  try {
    if (type === 'jlpt') {
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'usage', month), { jlpt_mini: increment(1) }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { jlpt_total: increment(1) }, { merge: true });
      }
    }
    if (type === 'sjpt') {
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'usage', month), { sjpt_mini: increment(1) }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { sjpt: increment(1) }, { merge: true });
      }
    }
  } catch {}
}

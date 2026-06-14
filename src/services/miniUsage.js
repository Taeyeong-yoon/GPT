import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// 무료 한도 (평생)
export const FREE_JLPT_PER_LEVEL = 20;
export const FREE_SJPT = 5;
export const FREE_DAILY_JLPT = 2;

// 유료 한도 (월별)
export const PRO_MONTHLY_JLPT = 60;
export const PRO_MONTHLY_SJPT = 30;
export const PRO_DAILY_JLPT = 3;
export const PRO_DAILY_SJPT = 2;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

async function getRaw(uid) {
  const [freeSnap, dailySnap, monthSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'mini_free', 'quota')),
    getDoc(doc(db, 'users', uid, 'mini_daily', todayKey())),
    getDoc(doc(db, 'users', uid, 'usage', monthKey())),
  ]);
  return {
    free:  freeSnap.exists()  ? freeSnap.data()  : {},
    daily: dailySnap.exists() ? dailySnap.data() : {},
    month: monthSnap.exists() ? monthSnap.data() : {},
  };
}

/** 미니 시험 접근 가능 여부 반환 */
export async function checkMiniAccess(uid, isPro, type, level = null) {
  if (!uid || !db) return { canStart: false, reason: 'login' };
  try {
    const { free, daily, month } = await getRaw(uid);

    if (type === 'jlpt') {
      const dailyUsed = daily.jlpt ?? 0;
      if (isPro) {
        const monthUsed = month.jlpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_JLPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_JLPT };
        if (dailyUsed >= PRO_DAILY_JLPT)   return { canStart: false, reason: 'daily',   used: dailyUsed,  limit: PRO_DAILY_JLPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_JLPT, dailyUsed, dailyLimit: PRO_DAILY_JLPT };
      } else {
        const lifeUsed = free[`jlpt_${level}`] ?? 0;
        if (lifeUsed >= FREE_JLPT_PER_LEVEL) return { canStart: false, reason: 'lifetime', used: lifeUsed, limit: FREE_JLPT_PER_LEVEL };
        if (dailyUsed >= FREE_DAILY_JLPT)    return { canStart: false, reason: 'daily',    used: dailyUsed, limit: FREE_DAILY_JLPT };
        return { canStart: true, lifeUsed, lifeLimit: FREE_JLPT_PER_LEVEL, dailyUsed, dailyLimit: FREE_DAILY_JLPT };
      }
    }

    if (type === 'sjpt') {
      if (isPro) {
        const monthUsed = month.sjpt_mini ?? 0;
        const dailyUsed = daily.sjpt ?? 0;
        if (monthUsed >= PRO_MONTHLY_SJPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_SJPT };
        if (dailyUsed >= PRO_DAILY_SJPT)   return { canStart: false, reason: 'daily',   used: dailyUsed,  limit: PRO_DAILY_SJPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_SJPT, dailyUsed, dailyLimit: PRO_DAILY_SJPT };
      } else {
        const lifeUsed = free.sjpt ?? 0;
        if (lifeUsed >= FREE_SJPT) return { canStart: false, reason: 'lifetime', used: lifeUsed, limit: FREE_SJPT };
        return { canStart: true, lifeUsed, lifeLimit: FREE_SJPT };
      }
    }
  } catch { return { canStart: true }; }
}

/** 미니 시험 완료 후 카운트 증가 */
export async function incrementMiniUsage(uid, isPro, type, level = null) {
  if (!uid || !db) return;
  const today = todayKey();
  const month = monthKey();
  try {
    if (type === 'jlpt') {
      await setDoc(doc(db, 'users', uid, 'mini_daily', today), { jlpt: increment(1) }, { merge: true });
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'usage', month), { jlpt_mini: increment(1) }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { [`jlpt_${level}`]: increment(1) }, { merge: true });
      }
    }
    if (type === 'sjpt') {
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'mini_daily', today), { sjpt: increment(1) }, { merge: true });
        await setDoc(doc(db, 'users', uid, 'usage', month), { sjpt_mini: increment(1) }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { sjpt: increment(1) }, { merge: true });
      }
    }
  } catch {}
}

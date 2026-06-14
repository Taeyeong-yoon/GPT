import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// 무료 한도 (주간 초기화)
export const FREE_WEEKLY_JLPT = 5;   // 주 5회
export const FREE_WEEKLY_SJPT = 2;   // 주 2회

// 유료 한도 (월별)
export const PRO_MONTHLY_JLPT = 60;
export const PRO_MONTHLY_SJPT = 10;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// 이번 주 월요일 날짜 문자열 (주간 리셋 기준)
function weekStart() {
  const d   = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon  = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
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
    const curWeek = weekStart();

    if (type === 'jlpt') {
      if (isPro) {
        const monthUsed = month.jlpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_JLPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_JLPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_JLPT };
      } else {
        const weekUsed = (free.jlpt_week_start === curWeek) ? (Number(free.jlpt_week_used) || 0) : 0;
        if (weekUsed >= FREE_WEEKLY_JLPT) return { canStart: false, reason: 'weekly', used: weekUsed, limit: FREE_WEEKLY_JLPT };
        return { canStart: true, weekUsed, weekLimit: FREE_WEEKLY_JLPT };
      }
    }

    if (type === 'sjpt') {
      if (isPro) {
        const monthUsed = month.sjpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_SJPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_SJPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_SJPT };
      } else {
        const weekUsed = (free.sjpt_week_start === curWeek) ? (Number(free.sjpt_week_used) || 0) : 0;
        if (weekUsed >= FREE_WEEKLY_SJPT) return { canStart: false, reason: 'weekly', used: weekUsed, limit: FREE_WEEKLY_SJPT };
        return { canStart: true, weekUsed, weekLimit: FREE_WEEKLY_SJPT };
      }
    }
  } catch { return { canStart: true }; }
}

/** 미니 시험 완료 후 카운트 증가 */
export async function incrementMiniUsage(uid, isPro, type) {
  if (!uid || !db) return;
  const month   = monthKey();
  const curWeek = weekStart();
  try {
    if (type === 'jlpt') {
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'usage', month), { jlpt_mini: increment(1) }, { merge: true });
      } else {
        const snap = await getDoc(doc(db, 'users', uid, 'mini_free', 'quota'));
        const data = snap.exists() ? snap.data() : {};
        if (data.jlpt_week_start === curWeek) {
          await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { jlpt_week_used: increment(1) }, { merge: true });
        } else {
          await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { jlpt_week_start: curWeek, jlpt_week_used: 1 }, { merge: true });
        }
      }
    }
    if (type === 'sjpt') {
      if (isPro) {
        await setDoc(doc(db, 'users', uid, 'usage', month), { sjpt_mini: increment(1) }, { merge: true });
      } else {
        const snap = await getDoc(doc(db, 'users', uid, 'mini_free', 'quota'));
        const data = snap.exists() ? snap.data() : {};
        if (data.sjpt_week_start === curWeek) {
          await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { sjpt_week_used: increment(1) }, { merge: true });
        } else {
          await setDoc(doc(db, 'users', uid, 'mini_free', 'quota'), { sjpt_week_start: curWeek, sjpt_week_used: 1 }, { merge: true });
        }
      }
    }
  } catch {}
}

import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// 무료 한도: 3일 3회
export const FREE_TRIAL_DAYS = 3;
export const FREE_TRIAL_COUNT = 3;

// 유료 한도 (월별)
export const PRO_MONTHLY_JLPT = 30;
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

/** 무료 유저 3일 3회 체험 유효 여부 */
function checkFreeTrial(free, type) {
  const startedKey = `${type}_trial_started_at`;
  const usedKey    = `${type}_trial_used`;

  const startedAt = free[startedKey];
  const used      = Number(free[usedKey]) || 0;

  if (!startedAt) {
    // 아직 시작 전 → 첫 번째 사용 허용
    return { canStart: true, used: 0, limit: FREE_TRIAL_COUNT, isNew: true };
  }

  const startedDate = new Date(startedAt);
  const daysPassed  = Math.floor((Date.now() - startedDate.getTime()) / 86400000);

  if (daysPassed >= FREE_TRIAL_DAYS) {
    return { canStart: false, reason: 'trial_expired', used, limit: FREE_TRIAL_COUNT };
  }
  if (used >= FREE_TRIAL_COUNT) {
    return { canStart: false, reason: 'trial_count', used, limit: FREE_TRIAL_COUNT };
  }
  return { canStart: true, used, limit: FREE_TRIAL_COUNT };
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
        return checkFreeTrial(free, 'jlpt');
      }
    }

    if (type === 'sjpt') {
      if (isPro) {
        const monthUsed = month.sjpt_mini ?? 0;
        if (monthUsed >= PRO_MONTHLY_SJPT) return { canStart: false, reason: 'monthly', used: monthUsed, limit: PRO_MONTHLY_SJPT };
        return { canStart: true, monthUsed, monthLimit: PRO_MONTHLY_SJPT };
      } else {
        return checkFreeTrial(free, 'sjpt');
      }
    }
  } catch { return { canStart: true }; }
}

/** 미니 시험 완료 후 카운트 증가 */
export async function incrementMiniUsage(uid, isPro, type) {
  if (!uid || !db) return;
  const month = monthKey();
  try {
    if (isPro) {
      const field = type === 'jlpt' ? 'jlpt_mini' : 'sjpt_mini';
      await setDoc(doc(db, 'users', uid, 'usage', month), { [field]: increment(1) }, { merge: true });
    } else {
      const startedKey = `${type}_trial_started_at`;
      const usedKey    = `${type}_trial_used`;
      const snap = await getDoc(doc(db, 'users', uid, 'mini_free', 'quota'));
      const data = snap.exists() ? snap.data() : {};

      if (!data[startedKey]) {
        // 첫 사용 → 시작 시각 기록 + 카운트 1
        await setDoc(
          doc(db, 'users', uid, 'mini_free', 'quota'),
          { [startedKey]: new Date().toISOString(), [usedKey]: 1 },
          { merge: true },
        );
      } else {
        await setDoc(
          doc(db, 'users', uid, 'mini_free', 'quota'),
          { [usedKey]: increment(1) },
          { merge: true },
        );
      }
    }
  } catch {}
}

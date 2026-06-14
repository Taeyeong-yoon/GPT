import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import {
  getSubscriptionStatus, getMonthlyUsage,
  EXAM_LIMITS, FREE_JLPT_FULL, getFreeJlptFullUsage,
} from '../services/subscription';

export default function useSubscriptionGuard(type) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, isPro: false, used: 0, limit: 0, canStart: false });

  useEffect(() => {
    if (!user) return;

    if (type === 'jlpt') {
      // JLPT: Pro → 월 2회 / 무료 → 평생 1회
      Promise.all([
        getSubscriptionStatus(user.uid),
        getMonthlyUsage(user.uid),
        getFreeJlptFullUsage(user.uid),
      ]).then(([sub, usage, freeUsed]) => {
        if (sub.isPro) {
          const used = usage.jlpt ?? 0;
          setState({
            loading: false, isPro: true,
            used, limit: EXAM_LIMITS.jlpt,
            canStart: used < EXAM_LIMITS.jlpt,
          });
        } else {
          setState({
            loading: false, isPro: false,
            used: freeUsed, limit: FREE_JLPT_FULL,
            canStart: freeUsed < FREE_JLPT_FULL,
            freeUsed,
          });
        }
      });
    } else {
      // SJPT: Pro 전용
      Promise.all([
        getSubscriptionStatus(user.uid),
        getMonthlyUsage(user.uid),
      ]).then(([sub, usage]) => {
        const used = usage[type] ?? 0;
        setState({
          loading: false, isPro: sub.isPro,
          used, limit: EXAM_LIMITS[type] ?? 0,
          canStart: sub.isPro && used < (EXAM_LIMITS[type] ?? 0),
        });
      });
    }
  }, [user, type]);

  return state;
}

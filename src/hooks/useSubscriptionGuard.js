import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { getSubscriptionStatus, getMonthlyUsage, EXAM_LIMITS } from '../services/subscription';

export default function useSubscriptionGuard(type) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, isPro: false, used: 0, limit: EXAM_LIMITS[type] });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getSubscriptionStatus(user.uid),
      getMonthlyUsage(user.uid),
    ]).then(([sub, usage]) => {
      const used = usage[type] ?? 0;
      setState({
        loading: false,
        isPro: sub.isPro,
        used,
        limit: EXAM_LIMITS[type],
        canStart: sub.isPro && used < EXAM_LIMITS[type],
      });
    });
  }, [user, type]);

  return state;
}

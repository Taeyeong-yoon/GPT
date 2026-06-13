import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

const SubscriptionContext = createContext({
  isPro: false, isPromo: false, plan: 'free', loading: true, subscription: null,
  refresh: () => {},
});

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ isPro: false, isPromo: false, plan: 'free', loading: true, subscription: null });

  const fetchStatus = async (firebaseUser) => {
    if (!firebaseUser) { setState(s => ({ ...s, isPro: false, plan: 'free', loading: false })); return; }
    try {
      const token = await firebaseUser.getIdToken();
      const res   = await fetch('/api/subscription', { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      setState({ isPro: data.isPro ?? false, isPromo: data.isPromo ?? false, plan: data.plan ?? 'free', subscription: data.subscription ?? null, loading: false });
    } catch {
      setState(s => ({ ...s, isPro: false, loading: false }));
    }
  };

  useEffect(() => { fetchStatus(user); }, [user]);

  const refresh = () => { setState(s => ({ ...s, loading: true })); fetchStatus(user); };

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

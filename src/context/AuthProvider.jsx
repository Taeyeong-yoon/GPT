import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, provider } from '../services/firebase';

const AuthContext = createContext(null);

// 네코짱 사용자 여부 세션 캐시 키
const CACHE_KEY = 'nm_neko_verified';

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isNekoUser, setIsNeko]   = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsNeko(false);
        sessionStorage.removeItem(CACHE_KEY);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // 세션 캐시 확인 (Firestore 중복 조회 방지)
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached === firebaseUser.uid) {
        setIsNeko(true);
        setLoading(false);
        return;
      }

      // 네코짱 Firestore에서 사용자 문서 확인
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        const verified = snap.exists();
        setIsNeko(verified);
        if (verified) sessionStorage.setItem(CACHE_KEY, firebaseUser.uid);
      } catch {
        setIsNeko(false);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, provider);

  const logout = () => {
    sessionStorage.removeItem(CACHE_KEY);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isNekoUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

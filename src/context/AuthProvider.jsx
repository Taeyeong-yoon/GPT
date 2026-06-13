import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithRedirect, signInWithPopup, signInWithCustomToken,
  getRedirectResult, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { auth, firebaseReady, provider } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return undefined;
    }

    // 네코짱 JLPT 앱 SSO: URL에 idToken 파라미터가 있으면 자동 로그인
    const params  = new URLSearchParams(window.location.search);
    const idToken = params.get('idToken');
    if (idToken) {
      // 보안을 위해 URL에서 즉시 제거
      window.history.replaceState({}, '', window.location.pathname);

      fetch('/api/sso', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.customToken) {
            return signInWithCustomToken(auth, data.customToken);
          }
        })
        .catch(err => console.error('[SSO] 자동 로그인 실패:', err));
    }

    // 리다이렉트 로그인 결과 처리
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return unsub;
  }, []);

  const login = async () => {
    if (!firebaseReady || !auth || !provider) {
      throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
    }

    try {
      // 팝업 먼저 시도, 실패하면 리다이렉트
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider);
      } else {
        throw e;
      }
    }
  };

  const logout = () => auth ? signOut(auth) : Promise.resolve();

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

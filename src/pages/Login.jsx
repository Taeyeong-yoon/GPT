import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // 이미 로그인됐으면 홈으로
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-cat">🐱</div>
        <h1 className="login-title">네코마스터</h1>
        <p className="login-sub">실전처럼 풀고, 시험처럼 통과하자</p>
      </div>

      <div className="login-body">
        <button className="btn btn--google" onClick={handleLogin} disabled={loading}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            width={20}
            height={20}
          />
          Google로 로그인
        </button>
      </div>
    </div>
  );
}

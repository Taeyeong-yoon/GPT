import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    setError(''); setBusy(true);
    try { await login(); }
    catch (e) {
      if (e.code !== 'auth/popup-closed-by-user')
        setError(`오류: ${e.code || e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <div className="login__hero">
        <div className="login__mascot">🐱</div>
        <h1 className="login__logo">네코짱 테스트</h1>
        <p className="login__slogan">실전처럼 풀고, 시험처럼 통과하자</p>
      </div>
      <div className="login__actions">
        <button className="btn btn--google btn--block" onClick={handleLogin} disabled={loading || busy}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
          {busy ? '로그인 중...' : 'Google로 로그인'}
        </button>
        {error && <p style={{fontSize:13,color:'#C04E1A',textAlign:'center'}}>{error}</p>}
      </div>
    </div>
  );
}

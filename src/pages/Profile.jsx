import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="profile-screen">
      <header className="screen-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>프로필</h1>
      </header>

      <div className="card profile-card">
        <div className="profile-avatar">
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" className="profile-avatar__img" />
            : <span>🐱</span>}
        </div>
        <p className="profile-name">{user?.displayName || '학습자'}</p>
        <p className="profile-email">{user?.email}</p>
      </div>

      <button className="btn btn--danger" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}

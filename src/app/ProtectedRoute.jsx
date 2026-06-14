import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import nekoSleepy from '../assets/neko-cats/neko-cat-10-sleepy.png';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="splash-screen">
        <img src={nekoSleepy} alt="네코짱" className="splash-cat" style={{width:96,height:96,objectFit:'contain'}} />
        <p className="splash-text">불러오는 중...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

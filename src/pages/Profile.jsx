import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import nekoStudy from '../assets/neko-cats/neko-cat-01-study.png';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login',{replace:true}); };

  return (
    <div className="screen">
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button className="btn btn--ghost" onClick={()=>navigate('/')}>←</button>
        <h2 className="screen__title">프로필</h2>
      </div>
      <div className="card" style={{textAlign:'center',padding:'var(--sp-6)'}}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="avatar" style={{width:72,height:72,borderRadius:'50%',marginBottom:12}}/>
          : <img src={nekoStudy} alt="네코짱" style={{width:72,height:72,objectFit:'contain',marginBottom:12}} />}
        <p style={{fontWeight:'var(--fw-extra)',fontSize:'var(--fs-xl)'}}>{user?.displayName||'학습자'}</p>
        <p style={{color:'var(--on-surface-2)',fontSize:'var(--fs-sm)',marginTop:4}}>{user?.email}</p>
      </div>
      <button className="btn btn--danger btn--block" onClick={handleLogout}>로그아웃</button>
    </div>
  );
}

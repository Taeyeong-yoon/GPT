import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db,'users',user.uid,'results'), orderBy('createdAt','desc')))
      .then(snap => setResults(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>{}).finally(()=>setLoading(false));
  }, [user]);

  return (
    <div className="screen">
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button className="btn btn--ghost" onClick={()=>navigate('/')}>←</button>
        <h2 className="screen__title">응시 기록</h2>
      </div>
      {loading && <p style={{color:'var(--on-surface-2)'}}>불러오는 중...</p>}
      {!loading && results.length===0 && (
        <div style={{textAlign:'center',padding:'var(--sp-8) 0'}}>
          <p style={{marginBottom:16}}>아직 응시 기록이 없어요.</p>
          <button className="btn btn--primary" onClick={()=>navigate('/jlpt')}>JLPT 시작</button>
        </div>
      )}
      <div className="stack gap-3">
        {results.map(r => (
          <div key={r.id} className="card" style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}
               onClick={()=>navigate(`/${r.type}/result/${r.id}`,{state:r})}>
            <span className={`chip chip--${r.level?.toLowerCase()}`}>{r.type?.toUpperCase()} {r.level}</span>
            <span style={{flex:1,fontWeight:'var(--fw-extra)'}}>{r.totalScore}점</span>
            <span style={{fontSize:'var(--fs-sm)',color:'var(--on-surface-2)'}}>
              {r.createdAt?.toDate?.().toLocaleDateString('ko-KR')??''}
            </span>
            <span>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

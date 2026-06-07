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
    const q = query(
      collection(db, 'users', user.uid, 'results'),
      orderBy('createdAt', 'desc')
    );
    getDocs(q)
      .then(snap => setResults(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="history-screen">
      <header className="screen-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>응시 기록</h1>
      </header>

      {loading && <p className="history-loading">불러오는 중...</p>}

      {!loading && results.length === 0 && (
        <div className="history-empty">
          <p>아직 응시 기록이 없어요.</p>
          <button className="btn btn--primary" onClick={() => navigate('/jlpt')}>
            JLPT 모의고사 시작
          </button>
        </div>
      )}

      <ul className="history-list">
        {results.map(r => (
          <li key={r.id} className="history-item card"
              onClick={() => navigate(`/${r.type}/result/${r.id}`)}>
            <span className={`chip chip--${r.level?.toLowerCase()}`}>
              {r.type?.toUpperCase()} {r.level}
            </span>
            <span className="history-item__score">{r.totalScore}점</span>
            <span className="history-item__date">
              {r.createdAt?.toDate?.().toLocaleDateString('ko-KR') ?? ''}
            </span>
            <span className="history-item__arrow">›</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'results'), orderBy('createdAt', 'desc'), limit(1));
    getDocs(q).then(snap => { if (!snap.empty) setLastResult(snap.docs[0].data()); }).catch(() => {});
  }, [user]);

  const nickname = user?.displayName?.split(' ')[0] || '학습자';

  return (
    <div className="screen">
      <div className="home__header">
        <p className="home__greeting">🐱 {nickname}님, 안녕하세요!</p>
        <button className="btn btn--ghost" onClick={() => navigate('/profile')} style={{padding:'6px 10px'}}>⚙️</button>
      </div>

      {lastResult && (
        <div className="recent">
          <span className="recent__icon">{lastResult.type === 'jlpt' ? '📝' : '🎙️'}</span>
          <div>
            <p className="recent__label">마지막 응시</p>
            <p className="recent__value">{lastResult.type?.toUpperCase()} {lastResult.level} — {lastResult.totalScore}점</p>
          </div>
          <span className="recent__prob">›</span>
        </div>
      )}

      <div className="home__entries">
        <button className="entry-card entry-card--jlpt" onClick={() => navigate('/jlpt')}>
          <span className="entry-card__icon">📝</span>
          <div>
            <p className="entry-card__title">JLPT 실전 모의고사</p>
            <p className="entry-card__meta">40문항 · 어휘/문법/독해/청해</p>
          </div>
          <span className="entry-card__arrow">›</span>
        </button>

        <button className="entry-card entry-card--sjpt" onClick={() => navigate('/sjpt')}>
          <span className="entry-card__icon">🎙️</span>
          <div>
            <p className="entry-card__title">SJPT 말하기 모의고사</p>
            <p className="entry-card__meta">8문항 · AI 종합 피드백</p>
          </div>
          <span className="entry-card__arrow">›</span>
        </button>
      </div>

      <div className="home__nav">
        <button onClick={() => navigate('/history')}>
          <span className="ico">📋</span>응시기록
        </button>
        <button onClick={() => navigate('/')}>
          <span className="ico">🏠</span>홈
        </button>
        <button onClick={() => navigate('/profile')}>
          <span className="ico">👤</span>프로필
        </button>
      </div>
    </div>
  );
}

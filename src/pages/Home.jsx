import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState(null);

  // 최근 응시 결과 1개 로드
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'results'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    getDocs(q).then(snap => {
      if (!snap.empty) setLastResult(snap.docs[0].data());
    }).catch(() => {});
  }, [user]);

  const nickname = user?.displayName?.split(' ')[0] || '학습자';

  return (
    <div className="home-screen">
      {/* 헤더 */}
      <header className="home-header">
        <div className="home-greeting">
          <span className="home-cat">🐱</span>
          <span>{nickname}님, 오늘도 화이팅!</span>
        </div>
        <button className="home-profile-btn" onClick={() => navigate('/profile')}>
          ⚙️
        </button>
      </header>

      {/* 최근 결과 위젯 */}
      {lastResult && (
        <div className="card home-last-result">
          <span className="chip chip--n5">최근 응시</span>
          <p className="home-last-score">
            {lastResult.type === 'jlpt' ? 'JLPT' : 'SJPT'}&nbsp;
            {lastResult.level} — {lastResult.totalScore}점
          </p>
        </div>
      )}

      {/* 핵심 카드 2개 */}
      <div className="home-cards">
        <button className="entry-card entry-card--jlpt" onClick={() => navigate('/jlpt')}>
          <div className="entry-card__icon">📝</div>
          <div className="entry-card__body">
            <h2 className="entry-card__title">JLPT 실전 모의고사</h2>
            <p className="entry-card__desc">40문항 · 어휘/문법/독해/청해</p>
          </div>
          <span className="entry-card__arrow">›</span>
        </button>

        <button className="entry-card entry-card--sjpt" onClick={() => navigate('/sjpt')}>
          <div className="entry-card__icon">🎙️</div>
          <div className="entry-card__body">
            <h2 className="entry-card__title">SJPT 말하기 모의고사</h2>
            <p className="entry-card__desc">8문항 · AI 종합 피드백</p>
          </div>
          <span className="entry-card__arrow">›</span>
        </button>
      </div>

      {/* 하단 내비 */}
      <nav className="home-nav">
        <button className="home-nav__btn" onClick={() => navigate('/history')}>
          📋 응시기록
        </button>
        <button className="home-nav__btn home-nav__btn--active">
          🏠 홈
        </button>
        <button className="home-nav__btn" onClick={() => navigate('/profile')}>
          👤 프로필
        </button>
      </nav>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import nekoLandingCat from '../assets/neko-landing-cat.jpg';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'results'), orderBy('createdAt', 'desc'), limit(1));
    getDocs(q).then(snap => { if (!snap.empty) setLastResult(snap.docs[0].data()); }).catch(() => {});
  }, [user]);

  const nickname = user?.displayName?.split(' ')[0] || '학습자';

  return (
    <div className="screen home-screen">
      <div className="home-ornament home-ornament--left" />
      <div className="home-ornament home-ornament--right" />

      {/* 브랜드바 */}
      <div className="home-brandbar">
        <div>
          <p className="home-brandbar__eyebrow">NEKOCHAN TEST</p>
          <h1 className="home-brandbar__title">
            {nickname}님,<br /><span>어떤 시험</span> 볼까요?
          </h1>
        </div>
        <button className="home-profile" onClick={() => navigate('/profile')} aria-label="프로필">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" />
            : <img src={nekoLandingCat} alt="네코짱" />}
        </button>
      </div>

      {/* 네코짱 응원 코치 */}
      <section className="coach-card">
        <div className="coach-card__avatar">
          <img src={nekoLandingCat} alt="네코짱" />
        </div>
        <div>
          <p className="coach-card__name">네코 코치</p>
          <p className="coach-card__message">
            실전처럼 풀고,<br />시험처럼 통과하자! 🐾
          </p>
        </div>
      </section>

      {/* 최근 응시 기록 */}
      {lastResult && (
        <button className="recent recent--action" onClick={() => navigate('/history')}>
          <span className="recent__icon">{lastResult.type === 'sjpt' ? '🎙️' : '📝'}</span>
          <div>
            <p className="recent__label">마지막 응시</p>
            <p className="recent__value">
              {lastResult.type?.toUpperCase()} {lastResult.level || ''} · {lastResult.totalScore ?? '-'}점
            </p>
          </div>
          <span className="recent__prob">›</span>
        </button>
      )}

      {/* 시험 진입 카드 */}
      <div className="home__entries">
        <button className="entry-card entry-card--jlpt" onClick={() => navigate('/jlpt')}>
          <div className="entry-card__top">
            <img src={nekoLandingCat} alt="" className="entry-card__cat-img" />
            <span className="entry-card__badge">JLPT</span>
          </div>
          <p className="entry-card__title">실전 모의고사</p>
          <p className="entry-card__meta">어휘·문법·독해·청해<br />40문항 실전 풀이</p>
          <span className="entry-card__arrow">시작하기 →</span>
        </button>

        <button className="entry-card entry-card--sjpt" onClick={() => navigate('/sjpt')}>
          <div className="entry-card__top">
            <img src={nekoLandingCat} alt="" className="entry-card__cat-img" />
            <span className="entry-card__badge">SJPT</span>
          </div>
          <p className="entry-card__title">말하기 시험</p>
          <p className="entry-card__meta">문제 청취·녹음·<br />AI 채점 피드백</p>
          <span className="entry-card__arrow">응시하기 →</span>
        </button>
      </div>

      {/* 하단 네비게이션 */}
      <div className="home__nav">
        <button className="is-active" onClick={() => navigate('/')}>
          <span className="ico">⌂</span>홈
        </button>
        <button onClick={() => navigate('/history')}>
          <span className="ico">▤</span>기록
        </button>
        <button onClick={() => navigate('/jlpt')}>
          <span className="ico">◇</span>JLPT
        </button>
        <button onClick={() => navigate('/sjpt')}>
          <span className="ico">✿</span>SJPT
        </button>
      </div>
    </div>
  );
}

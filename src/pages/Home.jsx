import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import { openPlayStore } from '../components/AppBanner';
import { isFromApp, IS_ANDROID } from '../utils/fromApp';
import nekoStudy    from '../assets/neko-cats/neko-cat-01-study.png';
import nekoTeacher  from '../assets/neko-cats/neko-cat-11-teacher.png';
import nekoCelebrate from '../assets/neko-cats/neko-cat-09-celebrate.png';
import nekoLogo     from '../assets/neko-cats/neko-cat-12-star-eyes.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState(null);
  const nickname = user?.displayName?.split(' ')[0] || '학습자';

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'results'), orderBy('createdAt', 'desc'), limit(1));
    getDocs(q).then(snap => { if (!snap.empty) setLastResult(snap.docs[0].data()); }).catch(() => {});
  }, [user]);

  return (
    <div className="hm">

      {/* ── 헤더 ── */}
      <header className="hm-header">
        <div className="hm-header__brand">
          <img src={nekoLogo} alt="네코짱" className="hm-header__logo" />
          <span className="hm-header__name">NEKOCHAN TEST</span>
        </div>
        <button className="hm-header__avatar" onClick={() => navigate('/profile')} aria-label="프로필">
          <img src={user?.photoURL || nekoStudy} alt="프로필" />
        </button>
      </header>

      {/* ── 네코 코치 카드 ── */}
      <div className="hm-coach">
        <img src={nekoTeacher} alt="네코 코치" className="hm-coach__img" />
        <div className="hm-coach__body">
          <p className="hm-coach__label">네코 코치</p>
          <p className="hm-coach__msg">실전처럼 응시하고,<br />시험처럼 통과하자! 🐾</p>
          {lastResult && (
            <button className="hm-recent" onClick={() => navigate('/history')}>
              {lastResult.type === 'sjpt' || lastResult.type === 'sjpt_mini' ? '🎙️' : '📝'}
              {' '}{lastResult.type?.replace('_mini','').toUpperCase()}
              {lastResult.level ? ` ${lastResult.level}` : ''}
              {lastResult.totalScore != null ? ` · ${lastResult.totalScore}점` : ''}
              <span className="hm-recent__arrow"> ›</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 정식 시험 통합 카드 2열 ── */}
      <div className="hm-cards">

        <button className="hm-card hm-card--jlpt" onClick={() => navigate('/jlpt')}>
          <span className="hm-card__badge hm-card__badge--jlpt">JLPT</span>
          <p className="hm-card__subject">능력 시험이란?</p>
          <p className="hm-card__desc">
            N1~N5 다섯 단계로 어휘·문법·독해·청해 능력을 측정하는 국제 공인 시험입니다.
          </p>
          <div className="hm-card__divider" />
          <p className="hm-card__title">모의고사</p>
          <p className="hm-card__meta">어휘·문법·독해·청해<br />40문항 실전 풀이</p>
          <span className="hm-card__start">시작하기 →</span>
        </button>

        <button className="hm-card hm-card--sjpt" onClick={() => navigate('/sjpt')}>
          <span className="hm-card__badge hm-card__badge--sjpt">SJPT</span>
          <p className="hm-card__subject">말하기 시험이란?</p>
          <p className="hm-card__desc">
            1~7부 구성으로 준비·녹음·AI 채점까지, 실제 시험과 동일한 흐름으로 말하기 실력을 진단합니다.
          </p>
          <div className="hm-card__divider" />
          <p className="hm-card__title">말하기</p>
          <p className="hm-card__meta">문제 청취·녹음<br />AI 채점 피드백</p>
          <span className="hm-card__start">응시하기 →</span>
        </button>

      </div>

      {/* ── 빠른 연습 ── */}
      <div className="hm-mini-wrap">
        <p className="hm-mini-label">🎯 실전 미니 테스트</p>
        <div className="hm-minicards">
          <button className="hm-minicard hm-minicard--jlpt" onClick={() => navigate('/jlpt/mini')}>
            <span className="hm-minicard__type">JLPT</span>
            <p className="hm-minicard__badge">미니 테스트</p>
            <p className="hm-minicard__meta">8문항 · 15분</p>
          </button>
          <button className="hm-minicard hm-minicard--sjpt" onClick={() => navigate('/sjpt/mini')}>
            <span className="hm-minicard__type">SJPT</span>
            <p className="hm-minicard__badge">미니 연습</p>
            <p className="hm-minicard__meta">10문항 · AI 채점</p>
          </button>
        </div>
      </div>

      {/* ── 앱 이동 ── */}
      {IS_ANDROID && !isFromApp() && (
        <button className="hm-applink" onClick={openPlayStore}>
          <span>📱 네코짱 앱 다운로드 (Google Play)</span>
        </button>
      )}

      {/* ── 하단 네비게이션 ── */}
      <nav className="hm-nav">
        <button className="hm-nav__btn is-active" onClick={() => navigate('/')}>
          <span className="hm-nav__ico">⌂</span>
          <span>홈</span>
        </button>
        <button className="hm-nav__btn" onClick={() => navigate('/history')}>
          <span className="hm-nav__ico">▤</span>
          <span>기록</span>
        </button>
        <button className="hm-nav__btn" onClick={() => navigate('/jlpt')}>
          <span className="hm-nav__ico">◇</span>
          <span>JLPT</span>
        </button>
        <button className="hm-nav__btn" onClick={() => navigate('/sjpt')}>
          <span className="hm-nav__ico">✿</span>
          <span>SJPT</span>
        </button>
      </nav>
    </div>
  );
}

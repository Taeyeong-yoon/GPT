import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import { openPlayStore } from '../components/AppBanner';
import nekoStudy    from '../assets/neko-cats/neko-cat-01-study.png';
import nekoTeacher  from '../assets/neko-cats/neko-cat-11-teacher.png';
import nekoCelebrate from '../assets/neko-cats/neko-cat-09-celebrate.png';
import nekoLogo     from '../assets/neko-cats/neko-cat-12-star-eyes.png';

const isAndroid = /Android/i.test(navigator.userAgent);
const fromApp   = new URLSearchParams(window.location.search).get('from') === 'app';

const GREETINGS = [
  '오늘도 일본어 실력을 쌓아봐요! 🐾',
  '꾸준히 하면 반드시 합격해요! ✨',
  '실전처럼 응시하고 시험처럼 통과하자! 🎯',
  '오늘의 연습이 내일의 합격을 만들어요! 📚',
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastResult, setLastResult] = useState(null);
  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length];
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
          {user?.photoURL
            ? <img src={user.photoURL} alt="" />
            : <img src={nekoStudy} alt="프로필" />}
        </button>
      </header>

      {/* ── 웰컴 배너 ── */}
      <section className="hm-welcome">
        <div className="hm-welcome__text">
          <p className="hm-welcome__hi">안녕하세요, <strong>{nickname}</strong>님!</p>
          <p className="hm-welcome__msg">{greeting}</p>
          {lastResult && (
            <button className="hm-recent" onClick={() => navigate('/history')}>
              <span>{lastResult.type === 'sjpt' || lastResult.type === 'sjpt_mini' ? '🎙️' : '📝'}</span>
              <span>
                {lastResult.type?.replace('_mini','').toUpperCase()}
                {lastResult.level ? ` ${lastResult.level}` : ''}
                {lastResult.totalScore != null ? ` · ${lastResult.totalScore}점` : ''}
              </span>
              <span className="hm-recent__arrow">›</span>
            </button>
          )}
        </div>
        <img src={nekoTeacher} alt="네코 코치" className="hm-welcome__cat" />
      </section>

      {/* ── 정식 시험 ── */}
      <section className="hm-section">
        <p className="hm-section__label">📋 정식 시험</p>
        <div className="hm-cards">
          <button className="hm-card hm-card--jlpt" onClick={() => navigate('/jlpt')}>
            <span className="hm-card__badge">JLPT</span>
            <p className="hm-card__title">모의고사</p>
            <p className="hm-card__desc">일본어 능력 측정 공인 시험</p>
            <p className="hm-card__meta">어휘·문법·독해·청해 · 40문항</p>
            <div className="hm-card__footer">
              <span className="hm-card__tag">N1~N5</span>
              <span className="hm-card__arrow">→</span>
            </div>
          </button>

          <button className="hm-card hm-card--sjpt" onClick={() => navigate('/sjpt')}>
            <span className="hm-card__badge">SJPT</span>
            <p className="hm-card__title">말하기</p>
            <p className="hm-card__desc">일본어 구어 능력 공인 평가</p>
            <p className="hm-card__meta">녹음·AI 채점 · 7부</p>
            <div className="hm-card__footer">
              <span className="hm-card__tag">AI 채점</span>
              <span className="hm-card__arrow">→</span>
            </div>
          </button>
        </div>
      </section>

      {/* ── 미니 테스트 ── */}
      <section className="hm-section">
        <p className="hm-section__label">⚡ 빠른 연습 (무료)</p>
        <div className="hm-minicards">
          <button className="hm-minicard hm-minicard--jlpt" onClick={() => navigate('/jlpt/mini')}>
            <div className="hm-minicard__top">
              <span className="hm-minicard__badge">JLPT 미니</span>
              <span className="hm-minicard__arrow">→</span>
            </div>
            <p className="hm-minicard__meta">8문항 · 15분 · 채점포함</p>
          </button>
          <button className="hm-minicard hm-minicard--sjpt" onClick={() => navigate('/sjpt/mini')}>
            <div className="hm-minicard__top">
              <span className="hm-minicard__badge">SJPT 미니</span>
              <span className="hm-minicard__arrow">→</span>
            </div>
            <p className="hm-minicard__meta">10문항 · 말하기 연습</p>
          </button>
        </div>
      </section>

      {/* ── 앱 이동 ── */}
      {isAndroid && !fromApp && (
        <button className="hm-applink" onClick={openPlayStore}>
          <img src={nekoCelebrate} alt="" className="hm-applink__cat" />
          <div>
            <p className="hm-applink__title">네코짱 JLPT 학습앱 이동</p>
            <p className="hm-applink__sub">단어·문법·진단까지 — Google Play 무료</p>
          </div>
          <span className="hm-applink__chevron">›</span>
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

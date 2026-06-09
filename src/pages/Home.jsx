import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import nekoLandingCat from '../assets/neko-landing-cat.jpg';

const CHEERS = [
  '오늘 맞춤 학습 종료. 다른 루트도 가보자.',
  '듣고, 말하고, 다시 확인하는 루트예요.',
  '오늘은 실전 감각을 조금 더 올려볼게요.',
  '네코짱이 오늘 분량을 차분히 골라뒀어요.',
];

const STAT_CARDS = [
  { tone: 'cream', label: '연속 학습', value: '4일째', icon: '🔥' },
  { tone: 'pink', label: '오늘 보상', value: '보상 획득', icon: '🎁' },
  { tone: 'sage', label: '오늘 목표', value: '준비 완료', icon: '✓' },
];

const STUDY_MODES = [
  { label: '학습', icon: '📚' },
  { label: '퀴즈', icon: '📝', active: true },
  { label: '보강', icon: '🧩' },
  { label: '자율', icon: '📁' },
];

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
  const cheer = CHEERS[new Date().getDate() % CHEERS.length];
  const lastResultLabel = lastResult
    ? `${lastResult.type?.toUpperCase()} ${lastResult.level || ''} · ${lastResult.totalScore ?? '-'}점`
    : '아직 응시 기록이 없어요';

  return (
    <div className="screen home-screen">
      <div className="home-ornament home-ornament--left" />
      <div className="home-ornament home-ornament--right" />

      <div className="home-brandbar">
        <div>
          <p className="home-brandbar__eyebrow">NEKOCHAN JLPT · SJPT</p>
          <h1 className="home-brandbar__title">
            오늘 공부는<br /><span>네코짱</span>이 골랐어
          </h1>
        </div>
        <button className="home-profile" onClick={() => navigate('/profile')} aria-label="프로필">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" />
            : <img src={nekoLandingCat} alt="" />}
        </button>
      </div>

      <section className="coach-card">
        <div className="coach-card__avatar">
          <img src={nekoLandingCat} alt="네코짱" />
        </div>
        <div>
          <p className="coach-card__name">네코 코치</p>
          <p className="coach-card__message">{nickname}님, {cheer}</p>
        </div>
      </section>

      <section className="home-hero-card">
        <img src={nekoLandingCat} alt="네코짱 JLPT 캐릭터" className="home-hero-card__image" />
        <div className="home-hero-card__copy">
          <span>냥</span>
          <p>앱에서 이어지는 JLPT·SJPT 테스트 홈페이지예요.</p>
        </div>
      </section>

      <div className="home-test-actions">
        <button className="home-test-button home-test-button--jlpt" onClick={() => navigate('/jlpt')}>
          JLPT TEST
        </button>
        <button className="home-test-button home-test-button--sjpt" onClick={() => navigate('/sjpt')}>
          SJPT TEST
        </button>
      </div>

      <div className="home-stats">
        {STAT_CARDS.map(card => (
          <div key={card.label} className={`home-stat home-stat--${card.tone}`}>
            <span className="home-stat__icon">{card.icon}</span>
            <p className="home-stat__label">{card.label}</p>
            <p className="home-stat__value">{card.value}</p>
          </div>
        ))}
      </div>

      <button className="recent recent--action" onClick={() => navigate(lastResult ? '/history' : '/jlpt')}>
        <span className="recent__icon">{lastResult?.type === 'sjpt' ? '🎙️' : '📋'}</span>
        <div>
          <p className="recent__label">최근 리포트</p>
          <p className="recent__value">{lastResultLabel}</p>
        </div>
        <span className="recent__prob">›</span>
      </button>

      <div className="home-section-title">
        <span>✦</span>
        <h2>오늘의 맞춤 학습</h2>
        <i />
      </div>

      <div className="mode-tabs" aria-label="학습 모드">
        {STUDY_MODES.map(mode => (
          <button key={mode.label} className={mode.active ? 'is-active' : ''}>
            <span>{mode.icon}</span>{mode.label}
          </button>
        ))}
      </div>

      <div className="home__entries">
        <button className="entry-card entry-card--jlpt" onClick={() => navigate('/jlpt')}>
          <div className="entry-card__top">
            <img src={nekoLandingCat} alt="" className="entry-card__cat-img" />
            <span className="entry-card__badge">JLPT</span>
          </div>
          <p className="entry-card__title">실전 모의고사</p>
          <p className="entry-card__meta">40문항으로 어휘, 문법, 독해, 청해를 한번에 점검해요.</p>
          <span className="entry-card__arrow">시작하기 →</span>
        </button>

        <button className="entry-card entry-card--sjpt" onClick={() => navigate('/sjpt')}>
          <div className="entry-card__top">
            <img src={nekoLandingCat} alt="" className="entry-card__cat-img" />
            <span className="entry-card__badge">SJPT</span>
          </div>
          <p className="entry-card__title">말하기 진단</p>
          <p className="entry-card__meta">문제 듣기, 녹음, AI 피드백까지 시험 흐름으로 진행해요.</p>
          <span className="entry-card__arrow">응시하기 →</span>
        </button>
      </div>

      <div className="home__nav">
        <button className="is-active" onClick={() => navigate('/')}>
          <span className="ico">⌂</span>홈
        </button>
        <button onClick={() => navigate('/history')}>
          <span className="ico">▤</span>리포트
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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { db } from '../services/firebase';
import { openPlayStore } from '../components/AppBanner';
import nekoStudy from '../assets/neko-cats/neko-cat-01-study.png';
import nekoTeacher from '../assets/neko-cats/neko-cat-11-teacher.png';

const isAndroid = /Android/i.test(navigator.userAgent);
const fromApp   = new URLSearchParams(window.location.search).get('from') === 'app';

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
            日本語 <span>시험</span> 도전!!
          </h1>
        </div>
        <button className="home-profile" onClick={() => navigate('/profile')} aria-label="프로필">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" />
            : <img src={nekoStudy} alt="네코짱" />}
        </button>
      </div>

      {/* 네코짱 응원 코치 */}
      <section className="coach-card">
        <div className="coach-card__avatar">
          <img src={nekoTeacher} alt="네코짱" />
        </div>
        <div>
          <p className="coach-card__name">네코 코치</p>
          <p className="coach-card__message">
            실전처럼 응시하고,<br />시험처럼 통과하자! 🐾
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

      {/* 시험 소개 — 진입 버튼 위로 */}
      <div className="home-exam-info">
        <div className="home-exam-info__item" onClick={() => navigate('/jlpt')}>
          <span className="home-exam-info__badge home-exam-info__badge--jlpt">JLPT</span>
          <div>
            <p className="home-exam-info__title">일본어 능력시험이란?</p>
            <p className="home-exam-info__desc">N1~N5 다섯 단계로 어휘·문법·독해·청해 능력을 측정하는 국제 공인 시험입니다.</p>
          </div>
        </div>
        <div className="home-exam-info__divider" />
        <div className="home-exam-info__item" onClick={() => navigate('/sjpt')}>
          <span className="home-exam-info__badge home-exam-info__badge--sjpt">SJPT</span>
          <div>
            <p className="home-exam-info__title">일본어 말하기 시험이란?</p>
            <p className="home-exam-info__desc">1~7부 구성으로 준비·녹음·AI 채점까지, 실제 시험과 동일한 흐름으로 말하기 실력을 진단합니다.</p>
          </div>
        </div>
      </div>

      {/* 시험 진입 카드 */}
      <div className="home__entries">
        <button className="entry-card entry-card--jlpt" onClick={() => navigate('/jlpt')}>
          <span className="entry-card__badge">JLPT</span>
          <p className="entry-card__title">모의고사</p>
          <p className="entry-card__meta">어휘·문법·독해·청해<br />40문항 실전 풀이</p>
          <span className="entry-card__arrow">시작하기 →</span>
        </button>

        <button className="entry-card entry-card--sjpt" onClick={() => navigate('/sjpt')}>
          <span className="entry-card__badge">SJPT</span>
          <p className="entry-card__title">말하기</p>
          <p className="entry-card__meta">문제 청취·녹음·<br />AI 채점 피드백</p>
          <span className="entry-card__arrow">응시하기 →</span>
        </button>
      </div>

      {/* 미니 테스트 진입 */}
      <div className="home__mini">
        <p className="home__mini-label">⚡ 빠른 연습</p>
        <div className="home__mini-btns">
          <button className="mini-btn mini-btn--jlpt" onClick={() => navigate('/jlpt/mini')}>
            <span className="mini-btn__badge">JLPT</span>
            <span className="mini-btn__title">미니 테스트</span>
            <span className="mini-btn__meta">8문항 · 15분</span>
          </button>
          <button className="mini-btn mini-btn--sjpt" onClick={() => navigate('/sjpt/mini')}>
            <span className="mini-btn__badge">SJPT</span>
            <span className="mini-btn__title">미니 연습</span>
            <span className="mini-btn__meta">10문항 · 채점없음</span>
          </button>
        </div>
      </div>

      {/* 앱 다운로드 링크 — Android, 앱 외부 접속 시만 표시 */}
      {isAndroid && !fromApp && (
        <button onClick={openPlayStore} className="home__app-link">
          <span>📱</span> 네코짱 앱 다운로드 (Google Play)
        </button>
      )}

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

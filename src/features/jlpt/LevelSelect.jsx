import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useSubscriptionGuard from '../../hooks/useSubscriptionGuard';
import { EXAM_LIMITS } from '../../services/subscription';
import { openPlayStore } from '../../components/AppBanner';
import nekoStudy from '../../assets/neko-cats/neko-cat-01-study.png';
import nekoHeart from '../../assets/neko-cats/neko-cat-02-heart-eyes.png';
import nekoSunglasses from '../../assets/neko-cats/neko-cat-03-sunglasses.png';
import nekoThinking from '../../assets/neko-cats/neko-cat-08-thinking.png';
import nekoStar from '../../assets/neko-cats/neko-cat-12-star-eyes.png';

const LEVELS = [
  { code:'N5', meta:'입문',     desc:'40문항 · 60분', image:nekoStudy,      cls:'level-card--n5' },
  { code:'N4', meta:'초급',     desc:'40문항 · 60분', image:nekoHeart,      cls:'level-card--n4' },
  { code:'N3', meta:'중급',     desc:'40문항 · 60분', image:nekoThinking,   cls:'level-card--n3' },
  { code:'N2', meta:'중상급',   desc:'40문항 · 60분', image:nekoSunglasses, cls:'level-card--n2' },
  { code:'N1', meta:'상급',     desc:'40문항 · 60분', image:nekoStar,       cls:'level-card--n1' },
];

export default function LevelSelect() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [selected, setSelected] = useState(state?.level ?? null);
  const guard = useSubscriptionGuard('jlpt');

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">JLPT 모의고사</h2>
        <p className="screen__sub">네코짱과 함께 응시할 레벨을 골라보세요</p>
      </div>

      <div className="levels">
        {LEVELS.map(lv => (
          <button
            key={lv.code}
            className={`level-card ${lv.cls} ${selected === lv.code ? 'is-selected' : ''}`}
            onClick={() => setSelected(lv.code)}
          >
            <img src={lv.image} alt="" className="level-card__cat-img" />
            <p className="level-card__name">{lv.code}</p>
            <p className="level-card__meta">{lv.meta}</p>
            <p className="level-card__desc">{lv.desc}</p>
          </button>
        ))}
      </div>

      {/* 무료 회원 — 체험 1회 남음 */}
      {!guard.loading && !guard.isPro && guard.canStart && (
        <div className="sub-gate" style={{background:'rgba(157,196,168,0.18)',border:'1.5px solid var(--sage)',borderRadius:14,padding:'14px 16px'}}>
          <p className="sub-gate__icon">🎁</p>
          <p className="sub-gate__title" style={{color:'var(--sage)'}}>무료 체험 1회 이용 가능</p>
          <p className="sub-gate__desc">JLPT 모의시험을 1회 무료로 체험할 수 있습니다.<br />Pro 구독 시 매월 {EXAM_LIMITS.jlpt}회 응시 가능합니다.</p>
        </div>
      )}
      {/* 무료 회원 — 체험 소진 */}
      {!guard.loading && !guard.isPro && !guard.canStart && (
        <div className="sub-gate sub-gate--locked">
          <p className="sub-gate__icon">🔒</p>
          <p className="sub-gate__title">무료 체험을 모두 사용했습니다</p>
          <p className="sub-gate__desc">JLPT 정식 모의시험은 Pro 구독자에게 매월 {EXAM_LIMITS.jlpt}회 제공됩니다.</p>
          <button className="btn btn--indigo btn--block" onClick={openPlayStore}>📱 네코짱 앱에서 구독하기</button>
        </div>
      )}
      {/* Pro 회원 — 횟수 초과 */}
      {!guard.loading && guard.isPro && !guard.canStart && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">📅</p>
          <p className="sub-gate__title">이번 달 횟수를 모두 사용했습니다</p>
          <p className="sub-gate__desc">JLPT 모의시험은 월 {guard.limit}회 제공됩니다.<br />({guard.used}/{guard.limit}회 사용) 다음 달에 다시 응시할 수 있습니다.</p>
        </div>
      )}

      <div className="cta-bar">
        {!guard.loading && guard.isPro && guard.canStart && (
          <p className="sub-usage">이번 달 JLPT 응시 {guard.used}/{guard.limit}회</p>
        )}
        <button
          className="btn btn--primary btn--block"
          disabled={!selected || guard.loading || !guard.canStart}
          onClick={() => navigate('/jlpt/exam', { state: { level: selected, isPro: guard.isPro } })}
        >
          {guard.loading ? '확인 중...'
            : !guard.canStart ? (guard.isPro ? '횟수 초과' : '체험 완료')
            : selected ? `${selected} 시작하기`
            : '레벨을 선택해주세요'}
        </button>
      </div>
    </div>
  );
}

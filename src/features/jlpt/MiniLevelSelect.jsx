import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { getSubscriptionStatus } from '../../services/subscription';
import { checkMiniAccess, FREE_TRIAL_COUNT, PRO_MONTHLY_JLPT } from '../../services/miniUsage';
import { openPlayStore } from '../../components/AppBanner';
import nekoStudy      from '../../assets/neko-cats/neko-cat-01-study.png';
import nekoHeart      from '../../assets/neko-cats/neko-cat-02-heart-eyes.png';
import nekoSunglasses from '../../assets/neko-cats/neko-cat-03-sunglasses.png';
import nekoThinking   from '../../assets/neko-cats/neko-cat-08-thinking.png';
import nekoStar       from '../../assets/neko-cats/neko-cat-12-star-eyes.png';

const LEVELS = [
  { code:'N5', meta:'입문',   image:nekoStudy,      cls:'level-card--n5' },
  { code:'N4', meta:'초급',   image:nekoHeart,      cls:'level-card--n4' },
  { code:'N3', meta:'중급',   image:nekoThinking,   cls:'level-card--n3' },
  { code:'N2', meta:'중상급', image:nekoSunglasses, cls:'level-card--n2' },
  { code:'N1', meta:'상급',   image:nekoStar,       cls:'level-card--n1' },
];

export default function JlptMiniLevelSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [isPro,    setIsPro]    = useState(false);
  const [access,   setAccess]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    getSubscriptionStatus(user.uid).then(sub => {
      setIsPro(sub.isPro);
      return checkMiniAccess(user.uid, sub.isPro, 'jlpt');
    }).then(a => { setAccess(a); setLoading(false); });
  }, [user]);

  const handleStart = () => {
    if (!selected || !access?.canStart) return;
    navigate('/jlpt/mini/exam', { state: { level: selected, isPro } });
  };

  const reason = access?.reason;
  const blocked = !loading && !access?.canStart;

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">JLPT 미니 테스트</h2>
        <p className="screen__sub">영역별 2문항 · 총 8문항 · 약 15분</p>
      </div>

      <div className="levels">
        {LEVELS.map(lv => (
          <button key={lv.code}
            className={`level-card ${lv.cls} ${selected === lv.code ? 'is-selected' : ''}`}
            onClick={() => setSelected(lv.code)}>
            <img src={lv.image} alt="" className="level-card__cat-img" />
            <p className="level-card__name">{lv.code}</p>
            <p className="level-card__meta">{lv.meta}</p>
            <p className="level-card__desc">8문항 · 15분</p>
          </button>
        ))}
      </div>

      {!loading && blocked && (reason === 'trial_expired' || reason === 'trial_count') && !isPro && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">🎓</p>
          <p className="sub-gate__title">무료 체험 종료</p>
          <p className="sub-gate__desc">무료 JLPT 미니 테스트는 3일 {FREE_TRIAL_COUNT}회입니다.<br/>Pro 구독으로 월 {PRO_MONTHLY_JLPT}회 이용하세요.</p>
          <button className="btn btn--indigo btn--block" onClick={openPlayStore}>📱 네코짱 앱에서 구독하기</button>
        </div>
      )}
      {!loading && blocked && reason === 'monthly' && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">📅</p>
          <p className="sub-gate__title">이번 달 한도 도달</p>
          <p className="sub-gate__desc">이번 달 JLPT 미니 {access?.used}/{PRO_MONTHLY_JLPT}회를 모두 사용했습니다.</p>
        </div>
      )}

      <div className="cta-bar">
        {!loading && access?.canStart && (
          <p className="sub-usage">
            {isPro
              ? `이번 달 ${access.monthUsed}/${access.monthLimit}회 사용`
              : `3일 체험 ${access.used ?? 0}/${FREE_TRIAL_COUNT}회 사용 · 남은 ${FREE_TRIAL_COUNT - (access.used ?? 0)}회`}
          </p>
        )}
        <button className="btn btn--primary btn--block"
          disabled={!selected || loading || blocked}
          onClick={handleStart}>
          {loading ? '확인 중...' : blocked ? '이용 불가' : selected ? `${selected} 미니 시작` : '레벨을 선택해주세요'}
        </button>
      </div>
    </div>
  );
}

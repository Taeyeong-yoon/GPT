import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useSubscription } from '../context/SubscriptionProvider';
import nekoTeacher from '../assets/neko-cats/neko-cat-11-teacher.png';
import nekoStar    from '../assets/neko-cats/neko-cat-12-star-eyes.png';
import './Pricing.css';

const FEATURES = {
  free: [
    { ok: true,  text: '네코짱 앱 전체 학습 (N5~N1)' },
    { ok: true,  text: '레벨 진단 무제한' },
    { ok: true,  text: '매일 AI 학습 플랜' },
    { ok: false, text: 'JLPT 모의시험' },
    { ok: false, text: 'SJPT 말하기 평가' },
    { ok: false, text: '앱-웹 통합 로그인' },
  ],
  pro: [
    { ok: true, text: '네코짱 앱 전체 학습 (N5~N1)' },
    { ok: true, text: '레벨 진단 무제한' },
    { ok: true, text: '매일 AI 학습 플랜' },
    { ok: true, text: 'JLPT 모의시험 월 3회', badge: 'NEW' },
    { ok: true, text: 'SJPT 말하기 평가 월 2회', badge: 'NEW' },
    { ok: true, text: '앱-웹 통합 로그인' },
  ],
};

export default function Pricing() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { isPro, isPromo, plan, subscription } = useSubscription();
  const [billing, setBilling]   = useState('monthly');
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');

  const handleSubscribe = async (selectedPlan) => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else setError(data.error || '결제 세션 생성에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen pricing-screen">
      {/* 헤더 */}
      <button className="pricing-back" onClick={() => navigate('/')} aria-label="뒤로">
        ← 홈
      </button>

      <div className="pricing-hero">
        <img src={nekoStar} alt="네코짱" className="pricing-hero__cat" />
        <div>
          <p className="pricing-hero__eyebrow">NEKOCHAN PREMIUM</p>
          <h1 className="pricing-hero__title">앱 + 웹 통합<br /><span>프로 구독</span></h1>
        </div>
      </div>

      {/* 출시 이벤트 배너 */}
      {isPromo && (
        <div className="pricing-promo-banner">
          <span>🎉</span>
          <span>출시 기념 이벤트 — 지금 전 기능 무료 체험 중!</span>
        </div>
      )}

      {/* 현재 구독 중 */}
      {isPro && !isPromo && (
        <div className="pricing-active-badge">
          ✅ 현재 <strong>{plan === 'yearly' ? '연간' : '월간'} 프로</strong> 구독 중
          {subscription?.expiresAt && (
            <span> · {new Date(subscription.expiresAt).toLocaleDateString('ko-KR')} 갱신</span>
          )}
        </div>
      )}

      {/* 월간 / 연간 토글 */}
      <div className="pricing-toggle">
        <button
          className={`pricing-toggle__btn ${billing === 'monthly' ? 'is-active' : ''}`}
          onClick={() => setBilling('monthly')}
        >월간</button>
        <button
          className={`pricing-toggle__btn ${billing === 'yearly' ? 'is-active' : ''}`}
          onClick={() => setBilling('yearly')}
        >
          연간
          <span className="pricing-toggle__save">17% 할인</span>
        </button>
      </div>

      {/* 요금 카드 */}
      <div className="pricing-cards">
        {/* Free */}
        <div className="pricing-card pricing-card--free">
          <div className="pricing-card__header">
            <p className="pricing-card__label">무료</p>
            <p className="pricing-card__price">
              <span className="pricing-card__amount">₩0</span>
              <span className="pricing-card__period">/월</span>
            </p>
            <p className="pricing-card__desc">앱 학습만 이용</p>
          </div>
          <ul className="pricing-card__features">
            {FEATURES.free.map((f, i) => (
              <li key={i} className={f.ok ? 'ok' : 'no'}>
                <span>{f.ok ? '✓' : '✕'}</span>{f.text}
              </li>
            ))}
          </ul>
          <button className="pricing-card__cta pricing-card__cta--outline" onClick={() => navigate('/')}>
            계속 무료로 이용
          </button>
        </div>

        {/* Pro */}
        <div className="pricing-card pricing-card--pro">
          <div className="pricing-card__badge">인기</div>
          <div className="pricing-card__header">
            <p className="pricing-card__label">프로</p>
            <p className="pricing-card__price">
              <span className="pricing-card__amount">
                {billing === 'yearly' ? '₩7,417' : '₩8,900'}
              </span>
              <span className="pricing-card__period">/월</span>
            </p>
            {billing === 'yearly' && (
              <p className="pricing-card__annual">연 ₩89,000 청구 (₩17,800 절약)</p>
            )}
            <p className="pricing-card__desc">앱 + 웹 모의시험 통합</p>
          </div>
          <ul className="pricing-card__features">
            {FEATURES.pro.map((f, i) => (
              <li key={i} className="ok">
                <span>✓</span>
                {f.text}
                {f.badge && <em className="pricing-feature-badge">{f.badge}</em>}
              </li>
            ))}
          </ul>
          {isPro && !isPromo ? (
            <button className="pricing-card__cta pricing-card__cta--disabled" disabled>
              현재 구독 중
            </button>
          ) : (
            <button
              className="pricing-card__cta"
              onClick={() => handleSubscribe(billing)}
              disabled={loading}
            >
              {loading ? '처리 중…' : `${billing === 'yearly' ? '연간' : '월간'} 구독 시작`}
            </button>
          )}
        </div>
      </div>

      {error && <p className="pricing-error">{error}</p>}

      {/* 네코 코치 안내 */}
      <div className="pricing-coach">
        <img src={nekoTeacher} alt="네코짱" />
        <div className="pricing-coach__bubble">
          <p>모의시험은 실제 시험 전날 꼭 한 번씩 풀어봐! 😸</p>
          <p className="pricing-coach__sub">언제든 구독 취소 가능 · 환불 정책 7일</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="pricing-faq">
        <h2>자주 묻는 질문</h2>
        {[
          ['월 3회/2회 제한이 언제 초기화되나요?', '매월 1일 자정 초기화됩니다.'],
          ['구독 취소 후 기존 이용 횟수는요?', '당월 종료 시까지 유지됩니다.'],
          ['앱 학습은 무료인가요?', '네, 네코짱 앱 전체 학습(N5~N1)은 영구 무료입니다.'],
          ['결제 수단은 어떻게 되나요?', '신용카드/체크카드 결제를 지원합니다. (Stripe 보안 결제)'],
        ].map(([q, a], i) => (
          <details key={i} className="pricing-faq__item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      {/* 하단 네비게이션 */}
      <div className="home__nav">
        <button onClick={() => navigate('/')}><span className="ico">⌂</span>홈</button>
        <button onClick={() => navigate('/history')}><span className="ico">▤</span>기록</button>
        <button onClick={() => navigate('/jlpt')}><span className="ico">◇</span>JLPT</button>
        <button onClick={() => navigate('/sjpt')}><span className="ico">✿</span>SJPT</button>
        <button className="is-active"><span className="ico">★</span>프리미엄</button>
      </div>
    </div>
  );
}

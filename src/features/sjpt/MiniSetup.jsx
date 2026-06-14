import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { getSubscriptionStatus } from '../../services/subscription';
import { checkMiniAccess, FREE_SJPT, PRO_MONTHLY_SJPT, PRO_DAILY_SJPT } from '../../services/miniUsage';
import { openPlayStore } from '../../components/AppBanner';

export default function SjptMiniSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPro,   setIsPro]   = useState(false);
  const [access,  setAccess]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getSubscriptionStatus(user.uid).then(sub => {
      setIsPro(sub.isPro);
      return checkMiniAccess(user.uid, sub.isPro, 'sjpt');
    }).then(a => { setAccess(a); setLoading(false); });
  }, [user]);

  const blocked = !loading && !access?.canStart;
  const reason  = access?.reason;

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">SJPT 미니 테스트</h2>
        <p className="screen__sub">1부 전체 + 2~7부 각 1문항 · 채점 없음</p>
      </div>

      <div className="part-preview" style={{opacity: blocked ? 0.4 : 1}}>
        {[
          { part:1, desc:'자기소개 4문항 전체' },
          { part:2, desc:'그림 보고 답하기 1문항' },
          { part:3, desc:'대화 완성 1문항' },
          { part:4, desc:'일상 화제 설명 1문항' },
          { part:5, desc:'의견 제시 1문항' },
          { part:6, desc:'상황 대응 1문항' },
          { part:7, desc:'스토리 구성 1문항' },
        ].map(p => (
          <div key={p.part} className="part-tile">
            <div className="stack" style={{gap:2}}>
              <p className="part-tile__name">제{p.part}부 · {p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{background:'var(--yellow-l)',border:'none',padding:'12px 16px',borderRadius:12}}>
        <p style={{fontSize:'var(--fs-sm)',color:'var(--on-surface-2)',textAlign:'center',margin:0}}>
          🎙️ 말하기 연습용 · AI 채점 없이 녹음만 진행됩니다
        </p>
      </div>

      {!loading && blocked && reason === 'lifetime' && !isPro && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">🎙️</p>
          <p className="sub-gate__title">무료 체험 횟수 소진</p>
          <p className="sub-gate__desc">무료 SJPT 미니 {FREE_SJPT}회를 모두 사용했습니다.<br/>Pro 구독으로 월 {PRO_MONTHLY_SJPT}회 이용하세요.</p>
          <button className="btn btn--indigo btn--block" onClick={openPlayStore}>📱 네코짱 앱에서 구독하기</button>
        </div>
      )}
      {!loading && blocked && reason === 'monthly' && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">📅</p>
          <p className="sub-gate__title">이번 달 한도 도달</p>
          <p className="sub-gate__desc">이번 달 SJPT 미니 {access?.used}/{PRO_MONTHLY_SJPT}회 사용했습니다.</p>
        </div>
      )}
      {!loading && blocked && reason === 'daily' && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">📅</p>
          <p className="sub-gate__title">오늘 한도 도달</p>
          <p className="sub-gate__desc">오늘 SJPT 미니 {access?.used}/{PRO_DAILY_SJPT}회 사용했습니다.<br/>내일 다시 이용할 수 있습니다.</p>
        </div>
      )}

      <div className="cta-bar">
        {!loading && access?.canStart && (
          <p className="sub-usage">
            {isPro
              ? `이번 달 ${access.monthUsed}/${access.monthLimit}회 · 오늘 ${access.dailyUsed}/${access.dailyLimit}회`
              : `누적 ${access.lifeUsed}/${access.lifeLimit}회 남음`}
          </p>
        )}
        <button className="btn btn--primary btn--block"
          disabled={loading || blocked}
          onClick={() => navigate('/sjpt/mini/exam', { state: { isPro } })}>
          {loading ? '확인 중...' : blocked ? '이용 불가' : '미니 시작하기'}
        </button>
      </div>
    </div>
  );
}

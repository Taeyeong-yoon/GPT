import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionProvider';
import nekoCelebrate from '../assets/neko-cats/neko-cat-09-celebrate.png';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refresh } = useSubscription();

  useEffect(() => {
    // 결제 완료 후 구독 상태 갱신
    refresh();
  }, []);

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
      <img src={nekoCelebrate} alt="네코짱" style={{ width: 120, height: 120, objectFit: 'contain' }} />

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.5rem' }}>
          프로 구독 완료! 🎉
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-mid)', fontWeight: 700, lineHeight: 1.6 }}>
          JLPT 모의시험과 SJPT 말하기 평가를<br />지금 바로 이용할 수 있어요.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <button
          onClick={() => navigate('/jlpt')}
          style={{
            padding: '0.875rem', borderRadius: '999px', border: 'none',
            background: 'var(--pink-d)', color: 'white',
            fontSize: '1rem', fontWeight: 900, cursor: 'pointer',
          }}
        >
          JLPT 모의시험 시작하기 →
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.875rem', borderRadius: '999px',
            border: '1.5px solid var(--border-soft)', background: 'transparent',
            color: 'var(--text-mid)', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  );
}

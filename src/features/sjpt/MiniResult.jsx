import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import nekoCelebrate from '../../assets/neko-cats/neko-cat-09-celebrate.png';

export default function SjptMiniResult() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const answers   = location.state?.answers || [];
  const answered  = answers.filter(a => a.answer && a.answer !== '(무응답)').length;

  return (
    <div className="screen" style={{alignItems:'center',justifyContent:'center',gap:'var(--sp-5)',textAlign:'center',padding:'var(--sp-6)'}}>
      <img src={nekoCelebrate} alt="완료" style={{width:120,height:120,objectFit:'contain'}} />
      <div>
        <p style={{fontSize:'var(--fs-xl)',fontWeight:'var(--fw-black)',color:'var(--on-surface)',marginBottom:4}}>미니 테스트 완료!</p>
        <p style={{fontSize:'var(--fs-sm)',color:'var(--on-surface-2)'}}>총 {answers.length}문항 중 {answered}문항 답변</p>
      </div>

      <div style={{width:'100%',background:'var(--surface)',borderRadius:16,border:'1.5px solid var(--border-soft)',padding:'16px 20px'}}>
        <p style={{fontWeight:'var(--fw-black)',marginBottom:12,color:'var(--on-surface)'}}>파트별 답변 현황</p>
        {[1,2,3,4,5,6,7].map(part => {
          const partAnswers = answers.filter(a => a.partNum === part);
          if (partAnswers.length === 0) return null;
          const ok = partAnswers.filter(a => a.answer !== '(무응답)').length;
          return (
            <div key={part} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border-soft)'}}>
              <span style={{fontSize:'var(--fs-sm)',color:'var(--on-surface-2)'}}>제{part}부</span>
              <span style={{fontSize:'var(--fs-sm)',fontWeight:'var(--fw-bold)',color: ok === partAnswers.length ? 'var(--sage)' : 'var(--on-surface-3)'}}>
                {ok}/{partAnswers.length} 완료
              </span>
            </div>
          );
        })}
      </div>

      <p style={{fontSize:'var(--fs-xs)',color:'var(--on-surface-3)',lineHeight:1.6}}>
        AI 채점은 정식 SJPT 시험에서 제공됩니다.<br/>Pro 구독 후 전체 시험을 응시해보세요.
      </p>

      <div style={{display:'flex',gap:10,width:'100%'}}>
        <button className="btn btn--secondary" style={{flex:1}} onClick={() => navigate('/sjpt/mini')}>다시 하기</button>
        <button className="btn btn--primary"   style={{flex:1}} onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

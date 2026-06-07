import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SEC = { vocabulary:'어휘', grammar:'문법', reading:'독해', listening:'청해' };
const SEC_CLS = { vocabulary:'vocab', grammar:'grammar', reading:'reading', listening:'listen' };

export default function JlptResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const result   = location.state?.result;
  const level    = location.state?.level || 'N5';
  const [openIdx, setOpenIdx] = useState(null);

  if (!result) return (
    <div className="screen" style={{alignItems:'center'}}>
      <p>결과를 불러올 수 없습니다.</p>
      <button className="btn btn--primary" onClick={()=>navigate('/')}>홈으로</button>
    </div>
  );

  const { totalScore, passStatus, sectionScores, sectionCorrect, sectionTotal, wrongItems, criteria } = result;

  return (
    <div className="screen">
      {/* 종합 점수 */}
      <div className="result-hero card">
        <p className="result-hero__score">{totalScore}<small>/180</small></p>
        <span className={`result-badge result-badge--${passStatus}`}>{passStatus==='pass'?'합격권':'불합격'}</span>
        <p className="result-hero__note">JLPT {level} · 합격 기준: {criteria?.total}점 이상</p>
      </div>

      {/* 섹션별 점수 */}
      <div className="card" style={{padding:'var(--sp-5)'}}>
        <p style={{fontWeight:'var(--fw-extra)',marginBottom:12}}>섹션별 점수</p>
        <div className="section-bars">
          {Object.entries(sectionScores).map(([sec, pts]) => {
            const total = sectionTotal[sec]||1;
            const corr  = sectionCorrect[sec]||0;
            const pct   = Math.round((corr/total)*100);
            return (
              <div key={sec} className={`section-bar section-bar--${SEC_CLS[sec]}`}>
                <div className="section-bar__head">
                  <span>{SEC[sec]}</span>
                  <span>{corr}/{total} ({pts}점)</span>
                </div>
                <div className="section-bar__track">
                  <div className="section-bar__fill" style={{width:`${pct}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 오답 목록 */}
      {wrongItems?.length > 0 && (
        <div className="card" style={{padding:'var(--sp-5)'}}>
          <p style={{fontWeight:'var(--fw-extra)',marginBottom:12}}>오답 {wrongItems.length}개</p>
          {wrongItems.map((w,i) => (
            <div key={w.id} className={`wrong-item ${openIdx===i?'is-open':''}`}>
              <button className="wrong-item__head" onClick={()=>setOpenIdx(openIdx===i?null:i)}>
                <span className={`chip chip--${level.toLowerCase()}`}>{SEC[w.section]}</span>
                <span style={{flex:1,textAlign:'left',fontSize:'var(--fs-sm)',marginLeft:8}}>{w.question.slice(0,40)}…</span>
                <span className="chev">▼</span>
              </button>
              <div className="wrong-item__body">
                <p style={{fontFamily:'var(--font-jp)',marginBottom:6}}>{w.question}</p>
                <p className="ans-mine">내 답: {w.selected!==null?String.fromCharCode(65+w.selected):'미응답'}</p>
                <p className="ans-correct">정답: {String.fromCharCode(65+w.correct)}</p>
                <p className="ans-expl">{w.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button className="btn btn--secondary" onClick={()=>navigate('/jlpt')}>다시 풀기</button>
        <button className="btn btn--primary"   onClick={()=>navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

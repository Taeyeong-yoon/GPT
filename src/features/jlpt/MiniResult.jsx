import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SEC     = { vocabulary:'어휘', grammar:'문법', reading:'독해', listening:'청해' };
const SEC_CLS = { vocabulary:'vocab', grammar:'grammar', reading:'reading', listening:'listen' };

function getGrade(pct) {
  if (pct >= 90) return { label: '완벽해요!', color: '#2E7D32' };
  if (pct >= 70) return { label: '잘했어요!', color: 'var(--sage)' };
  if (pct >= 50) return { label: '조금만 더!', color: '#B36A00' };
  return { label: '더 연습해요', color: 'var(--danger)' };
}

export default function JlptMiniResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const result   = location.state?.result;
  const level    = location.state?.level || 'N5';
  const [openIdx, setOpenIdx] = useState(null);

  if (!result) return (
    <div className="screen" style={{ alignItems: 'center', gap: 'var(--sp-4)' }}>
      <p style={{ color: 'var(--on-surface-2)' }}>결과를 불러올 수 없습니다.</p>
      <button className="btn btn--primary" onClick={() => navigate('/')}>홈으로</button>
    </div>
  );

  const { sectionCorrect = {}, sectionTotal = {}, wrongItems = [] } = result;

  const totalCorrect   = Object.values(sectionCorrect).reduce((a, b) => a + b, 0);
  const totalQuestions = Object.values(sectionTotal).reduce((a, b) => a + b, 0);
  const percentage     = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const grade          = getGrade(percentage);

  return (
    <div className="screen">

      {/* ── 종합 결과 ── */}
      <div className="result-hero card" style={{ gap: 'var(--sp-2)' }}>
        <p className="result-hero__score">
          {totalCorrect}<small>/{totalQuestions}</small>
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 'var(--fw-black)', color: grade.color, margin: 0 }}>
          {percentage}%
        </p>
        <span className="result-badge" style={{ background: grade.color, color: '#fff', borderRadius: 20, padding: '4px 14px' }}>
          {grade.label}
        </span>
        <p className="result-hero__note">JLPT {level} 미니 테스트</p>
      </div>

      {/* ── 섹션별 결과 ── */}
      {Object.keys(sectionCorrect).length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <p style={{ fontWeight: 'var(--fw-extra)', marginBottom: 12 }}>섹션별 결과</p>
          <div className="section-bars">
            {Object.entries(sectionCorrect).map(([sec, corr]) => {
              const total = sectionTotal[sec] || 1;
              const pct   = Math.round((corr / total) * 100);
              return (
                <div key={sec} className={`section-bar section-bar--${SEC_CLS[sec] || sec}`}>
                  <div className="section-bar__head">
                    <span>{SEC[sec] || sec}</span>
                    <span>{corr}/{total} ({pct}%)</span>
                  </div>
                  <div className="section-bar__track">
                    <div className="section-bar__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 오답 목록 ── */}
      {wrongItems.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <p style={{ fontWeight: 'var(--fw-extra)', marginBottom: 12 }}>
            오답 {wrongItems.length}개 — 다시 확인해 보세요
          </p>
          {wrongItems.map((w, i) => (
            <div key={w.id || i} className={`wrong-item ${openIdx === i ? 'is-open' : ''}`}>
              <button className="wrong-item__head" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <span className={`chip chip--${level.toLowerCase()}`}>{SEC[w.section] || w.section}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 'var(--fs-sm)', marginLeft: 8 }}>
                  {w.question?.slice(0, 40)}…
                </span>
                <span className="chev">▼</span>
              </button>
              <div className="wrong-item__body">
                <p style={{ fontFamily: 'var(--font-jp)', marginBottom: 6 }}>{w.question}</p>
                <p className="ans-mine">내 답: {w.selected != null ? String.fromCharCode(65 + w.selected) : '미응답'}</p>
                <p className="ans-correct">정답: {String.fromCharCode(65 + w.correct)}</p>
                <p className="ans-expl">{w.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {wrongItems.length === 0 && totalQuestions > 0 && (
        <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--fs-lg)', marginBottom: 6 }}>🏆</p>
          <p style={{ fontWeight: 'var(--fw-black)', color: 'var(--sage)' }}>전부 정답! 완벽한 점수예요</p>
        </div>
      )}

      <div className="result-actions">
        <button className="btn btn--secondary" onClick={() => navigate('/jlpt/mini')}>다시 풀기</button>
        <button className="btn btn--primary"   onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

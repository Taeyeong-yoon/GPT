import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { requestFeedback } from '../../services/gpt';
import styles from './Result.module.css';

const SCORE_LABELS = { grammar:'문법', vocabulary:'어휘', fluency:'유창성', naturalness:'자연스러움' };
const SCORE_COLORS = { grammar:'#9DC4A8', vocabulary:'#C5B8E8', fluency:'#FFAFC7', naturalness:'#FFE066' };

const GRADING_STEPS = ['답변 분석 중...', '문법 검토 중...', '유창성 평가 중...', '점수 계산 중...'];

export default function SjptMiniResult() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const answers   = location.state?.answers || [];

  const [feedback, setFeedback] = useState(null);
  const [grading,  setGrading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [openPart, setOpenPart] = useState(null);
  const [stepIdx,  setStepIdx]  = useState(0);
  const [elapsed,  setElapsed]  = useState(0);

  useEffect(() => {
    if (!grading) return;
    const t1 = setInterval(() => setElapsed(s => s + 1), 1000);
    const t2 = setInterval(() => setStepIdx(i => (i + 1) % GRADING_STEPS.length), 3500);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [grading]);

  useEffect(() => {
    if (answers.length === 0) { setGrading(false); return; }
    requestFeedback({ parts: answers, level: 'N3', mini: true })
      .then(f => setFeedback(f))
      .catch(e => setError(e.message))
      .finally(() => setGrading(false));
  }, []);

  if (grading) return (
    <div className="screen" style={{ alignItems:'center', justifyContent:'center', gap:'var(--sp-4)' }}>
      <div style={{ width:48, height:48, borderRadius:'50%', border:'4px solid #F9C8DA', borderTopColor:'#E05C8A', animation:'spin 0.8s linear infinite' }} />
      <p className={styles.gradingText}>{GRADING_STEPS[stepIdx]}</p>
      <p style={{ fontSize:'var(--fs-xs)', color:'var(--on-surface-3)' }}>{elapsed}초 경과</p>
    </div>
  );

  if (error || !feedback) return (
    <div className="screen" style={{ alignItems:'center', justifyContent:'center', gap:'var(--sp-4)', padding:'32px 24px' }}>
      <p style={{ fontSize:'2rem' }}>😿</p>
      <p style={{ textAlign:'center', fontWeight:700, color:'var(--on-surface)', fontSize:'var(--fs-md)' }}>
        AI 채점에 실패했어요
      </p>
      <p style={{ textAlign:'center', color:'var(--on-surface-2)', fontSize:'var(--fs-sm)', lineHeight:1.6 }}>
        {error || '채점 결과를 받아오지 못했습니다.'}<br/>잠시 후 다시 시도해 주세요.
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn btn--secondary" onClick={() => navigate('/sjpt/mini')}>다시 하기</button>
        <button className="btn btn--primary"   onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );

  const { overall_score, grade, scores, part_feedback, improvements, model_expressions } = feedback;
  const answered = answers.filter(a => a.answer && a.answer !== '(무응답)').length;

  return (
    <div className={styles.screen}>

      {/* ── 종합 점수 ── */}
      <div className={`card ${styles.hero}`}>
        <p style={{ fontSize:'var(--fs-xs)', color:'var(--on-surface-3)', marginBottom:4 }}>
          SJPT 미니 테스트 · {answers.length}문항 중 {answered}문항 답변
        </p>
        <p className={styles.scoreNum}>{overall_score}<span className={styles.scoreMax}>/100</span></p>
        <span className={styles.grade}>{grade}</span>
        <p className={styles.label}>AI 종합 점수</p>
      </div>

      {/* ── 4축 게이지 ── */}
      <div className={`card ${styles.gauges}`}>
        <h3 className={styles.sectionTitle}>영역별 점수</h3>
        <div className={styles.gaugeGrid}>
          {Object.entries(scores || {}).map(([key, val]) => (
            <div key={key} className={styles.gauge}>
              <div className={styles.gaugeCircle}
                style={{ background:`conic-gradient(${SCORE_COLORS[key]} ${val / 25 * 100}%, #EDD5B5 0)` }}>
                <span className={styles.gaugeVal}>{val}</span>
              </div>
              <p className={styles.gaugeLabel}>{SCORE_LABELS[key]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 파트별 코멘트 ── */}
      {(part_feedback || []).length > 0 && (
        <div className={`card ${styles.partFeedback}`}>
          <h3 className={styles.sectionTitle}>파트별 코멘트</h3>
          {part_feedback.map(pf => (
            <div key={pf.part} className={styles.partItem}>
              <button className={styles.partToggle}
                onClick={() => setOpenPart(openPart === pf.part ? null : pf.part)}>
                <span className="chip chip--n3">제{pf.part}부분</span>
                <span className={styles.toggleArrow}>{openPart === pf.part ? '▲' : '▼'}</span>
              </button>
              {openPart === pf.part && (
                <div className={styles.partDetail}>
                  {(pf.strength && pf.strength !== '없음') && (
                    <div className={styles.partRowStrength}>
                      <span className={styles.partLabelGreen}>✓ 잘된 점</span>
                      <p className={styles.partRowText}>{pf.strength}</p>
                    </div>
                  )}
                  {pf.weakness && (
                    <div className={styles.partRowWeakness}>
                      <span className={styles.partLabelOrange}>△ 개선할 점</span>
                      <p className={styles.partRowText}>{pf.weakness}</p>
                    </div>
                  )}
                  {pf.tip && (
                    <div className={styles.partRowTip}>
                      <span className={styles.partLabelBlue}>💡 표현 팁</span>
                      <p className={styles.partRowText}>{pf.tip}</p>
                    </div>
                  )}
                  {!pf.strength && !pf.weakness && !pf.tip && pf.comment && (
                    <p className={styles.partComment}>{pf.comment}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 핵심 개선 포인트 ── */}
      {(improvements || []).length > 0 && (
        <div className={`card ${styles.improvements}`}>
          <h3 className={styles.sectionTitle}>핵심 개선 포인트</h3>
          <ol className={styles.improveList}>
            {improvements.map((imp, i) => (
              <li key={i} className={styles.improveItem}>{imp}</li>
            ))}
          </ol>
        </div>
      )}

      {/* ── 모범 표현 ── */}
      {(model_expressions || []).length > 0 && (
        <div className={`card ${styles.models}`}>
          <h3 className={styles.sectionTitle}>더 자연스러운 표현</h3>
          {model_expressions.map((m, i) => (
            <div key={i} className={styles.modelItem}>
              <p className={styles.modelSituation}>{m.situation}</p>
              <p className={styles.modelExpr}>{m.natural_expression}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 내 답변 STT ── */}
      {answers.length > 0 && (
        <div className={`card ${styles.myAnswers}`}>
          <h3 className={styles.sectionTitle}>내 답변 (STT)</h3>
          {answers.map((a, i) => (
            <div key={i} className={styles.answerItem}>
              <p className={styles.answerQ}>Part {a.partNum}: {a.question?.slice(0, 40)}…</p>
              <p className={styles.answerA}>{a.answer || '(무응답)'}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn--secondary" onClick={() => navigate('/sjpt/mini')}>다시 하기</button>
        <button className="btn btn--primary"   onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

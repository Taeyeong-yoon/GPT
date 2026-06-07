import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSjptFlow } from './hooks/useSjptFlow';
import { requestFeedback } from '../../services/gpt';
import styles from './Result.module.css';

const SCORE_LABELS = { grammar: '문법', vocabulary: '어휘', fluency: '유창성', naturalness: '자연스러움' };
const SCORE_COLORS = { grammar: '#9DC4A8', vocabulary: '#C5B8E8', fluency: '#FFAFC7', naturalness: '#FFE066' };

export default function SjptResult() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const answers   = location.state?.answers || [];

  const [feedback, setFeedback] = useState(null);
  const [grading,  setGrading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [openPart, setOpenPart] = useState(null);

  useEffect(() => {
    if (answers.length === 0) { setGrading(false); return; }

    requestFeedback({ parts: answers, level: 'N3' })
      .then(f => setFeedback(f))
      .catch(e => setError(e.message))
      .finally(() => setGrading(false));
  }, []);

  if (grading) return (
    <div className="splash-screen">
      <div className={`splash-cat ${styles.bounce}`}>🐱</div>
      <p className={styles.gradingText}>채점 중이에요... 잠시만요</p>
    </div>
  );

  if (error || !feedback) return (
    <div className="splash-screen">
      <p>{error || '결과를 불러올 수 없습니다.'}</p>
      <button className="btn btn--primary" onClick={() => navigate('/')}>홈으로</button>
    </div>
  );

  const { overall_score, grade, scores, part_feedback, improvements, model_expressions } = feedback;

  return (
    <div className={styles.screen}>
      {/* 종합 점수 */}
      <div className={`card ${styles.hero}`}>
        <p className={styles.scoreNum}>{overall_score}<span className={styles.scoreMax}>/100</span></p>
        <span className={styles.grade}>{grade}</span>
        <p className={styles.label}>SJPT 종합 점수</p>
      </div>

      {/* 4축 게이지 */}
      <div className={`card ${styles.gauges}`}>
        <h3 className={styles.sectionTitle}>영역별 점수</h3>
        <div className={styles.gaugeGrid}>
          {Object.entries(scores || {}).map(([key, val]) => (
            <div key={key} className={styles.gauge}>
              <div className={styles.gaugeCircle}
                style={{ background: `conic-gradient(${SCORE_COLORS[key]} ${val / 25 * 100}%, #EDD5B5 0)` }}>
                <span className={styles.gaugeVal}>{val}</span>
              </div>
              <p className={styles.gaugeLabel}>{SCORE_LABELS[key]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 파트별 코멘트 */}
      {(part_feedback || []).length > 0 && (
        <div className={`card ${styles.partFeedback}`}>
          <h3 className={styles.sectionTitle}>파트별 코멘트</h3>
          {part_feedback.map(pf => (
            <div key={pf.part} className={styles.partItem}>
              <button className={styles.partToggle}
                onClick={() => setOpenPart(openPart === pf.part ? null : pf.part)}>
                <span className={`chip chip--n3`}>Part {pf.part}</span>
                <span className={styles.toggleArrow}>{openPart === pf.part ? '▲' : '▼'}</span>
              </button>
              {openPart === pf.part && <p className={styles.partComment}>{pf.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 핵심 개선 포인트 */}
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

      {/* 모범 표현 */}
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

      {/* 내 답변 */}
      {answers.length > 0 && (
        <div className={`card ${styles.myAnswers}`}>
          <h3 className={styles.sectionTitle}>내 답변 (STT)</h3>
          {answers.map((a, i) => (
            <div key={i} className={styles.answerItem}>
              <p className={styles.answerQ}>Part {a.partNum}: {a.question?.slice(0, 40)}…</p>
              <p className={styles.answerA}>{a.answer}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn--secondary" onClick={() => navigate('/sjpt')}>다시 풀기</button>
        <button className="btn btn--primary"   onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

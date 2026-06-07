import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Result.module.css';

const SECTION_LABELS = {
  vocabulary: '어휘', grammar: '문법', reading: '독해', listening: '청해',
};
const SECTION_COLORS = {
  vocabulary: 'var(--yellow-l)', grammar: 'var(--lav-l)',
  reading: 'var(--sage-l)',      listening: 'var(--pink-l)',
};

export default function JlptResult() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const result    = location.state?.result;
  const level     = location.state?.level || 'N5';

  const [openIdx, setOpenIdx] = useState(null);

  if (!result) {
    return (
      <div className="splash-screen">
        <p>결과를 불러올 수 없습니다.</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>홈으로</button>
      </div>
    );
  }

  const { totalScore, passStatus, sectionScores, sectionCorrect, sectionTotal, wrongItems } = result;

  return (
    <div className={styles.screen}>
      {/* 종합 점수 */}
      <div className={`card ${styles.hero}`}>
        <p className={styles.scoreNum}>{totalScore}<span className={styles.scoreMax}>/180</span></p>
        <span className={`${styles.badge} ${passStatus === 'pass' ? styles.pass : styles.fail}`}>
          {passStatus === 'pass' ? '합격권' : '불합격'}
        </span>
        <p className={styles.levelLabel}>JLPT {level}</p>
        <p className={styles.criteria}>합격 기준: {result.criteria?.total}점 이상</p>
      </div>

      {/* 섹션별 점수 */}
      <div className={`card ${styles.sections}`}>
        <h3 className={styles.sectionTitle}>섹션별 점수</h3>
        {Object.entries(sectionScores).map(([sec, pts]) => {
          const total = sectionTotal[sec] || 1;
          const corr  = sectionCorrect[sec] || 0;
          const pct   = Math.round((corr / total) * 100);
          return (
            <div key={sec} className={styles.sectionRow}>
              <span className={styles.sectionName}>{SECTION_LABELS[sec]}</span>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ width: `${pct}%`, background: SECTION_COLORS[sec] }}
                />
              </div>
              <span className={styles.sectionPts}>{corr}/{total} ({pts}점)</span>
            </div>
          );
        })}
      </div>

      {/* 오답 목록 */}
      {wrongItems.length > 0 && (
        <div className={`card ${styles.wrongs}`}>
          <h3 className={styles.sectionTitle}>오답 {wrongItems.length}개</h3>
          {wrongItems.map((w, i) => (
            <div key={w.id} className={styles.wrongItem}>
              <button
                className={styles.wrongQ}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span className={`chip chip--${level.toLowerCase()}`}>{SECTION_LABELS[w.section]}</span>
                <span className={styles.wrongQText}>{w.question.slice(0, 40)}…</span>
                <span>{openIdx === i ? '▲' : '▼'}</span>
              </button>
              {openIdx === i && (
                <div className={styles.wrongDetail}>
                  <p className={styles.wrongFull}>{w.question}</p>
                  <p className={styles.wrongMine}>내 답: 선택지 {w.selected !== null ? String.fromCharCode(65 + w.selected) : '미응답'}</p>
                  <p className={styles.wrongCorrect}>정답: 선택지 {String.fromCharCode(65 + w.correct)}</p>
                  <p className={styles.wrongExpl}>{w.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className={styles.actions}>
        <button className="btn btn--secondary" onClick={() => navigate('/jlpt')}>다시 풀기</button>
        <button className="btn btn--primary"   onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthProvider';
import { db } from '../../services/firebase';
import { useJlptQuestions } from './hooks/useJlptQuestions';
import { scoreJlpt } from '../../utils/jlptScoring';
import { storage } from '../../utils/storage';
import styles from './Exam.module.css';

const SECTION_LABELS = {
  vocabulary: '어휘', grammar: '문법', reading: '독해', listening: '청해',
};
const TOTAL_TIME = 60 * 60; // 60분(초)

export default function JlptExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const level     = location.state?.level || 'N5';

  const { examSet, loading, error } = useJlptQuestions(level);

  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState({});   // { id: selectedIndex }
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);

  const PROGRESS_KEY = `nm_jlpt_progress_${level}`;

  // 진행 상태 복원
  useEffect(() => {
    const saved = storage.get(PROGRESS_KEY);
    if (saved && saved.level === level) {
      setAnswers(saved.answers || {});
      setCurrent(saved.current || 0);
    }
  }, [level]);

  // 진행 상태 자동 저장
  useEffect(() => {
    if (examSet.length === 0) return;
    storage.set(PROGRESS_KEY, { level, answers, current });
  }, [answers, current, level, examSet]);

  // 타이머
  useEffect(() => {
    if (loading || examSet.length === 0) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [loading, examSet]);

  // 이탈 경고
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleSelect = (id, idx) => {
    if (revealed) return;
    setAnswers(prev => {
      const next = { ...prev };
      if (next[id] === idx) {
        // 같은 보기 두 번 탭 → 정답 공개
        setRevealed(true);
      } else {
        next[id] = idx;
        setRevealed(false);
      }
      return next;
    });
  };

  const handleNext = () => {
    setRevealed(false);
    if (current < examSet.length - 1) {
      setCurrent(c => c + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const result = scoreJlpt({ examSet, answers, level });

    try {
      const docRef = await addDoc(
        collection(db, 'users', user.uid, 'results'),
        { type: 'jlpt', level, ...result, createdAt: serverTimestamp() }
      );
      storage.remove(PROGRESS_KEY);
      navigate(`/jlpt/result/${docRef.id}`, { state: { result, level } });
    } catch {
      // Firestore 실패해도 결과 화면은 보여줌
      storage.remove(PROGRESS_KEY);
      navigate('/jlpt/result/local', { state: { result, level } });
    }
  }, [examSet, answers, level, user, submitting]);

  if (loading) return (
    <div className="splash-screen"><div className="splash-cat">🐱</div><p>문제 준비 중...</p></div>
  );
  if (error) return (
    <div className="splash-screen">
      <p>문제를 불러오지 못했습니다.</p>
      <button className="btn btn--primary" onClick={() => navigate('/jlpt')}>돌아가기</button>
    </div>
  );

  const item      = examSet[current];
  const section   = item?.section || 'vocabulary';
  const progress  = Math.round(((current + 1) / examSet.length) * 100);
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const timeWarn = timeLeft < 300;

  return (
    <div className={styles.screen}>
      {/* 상단 고정 헤더 */}
      <header className="exam-header">
        <span className={styles.sectionLabel}>{SECTION_LABELS[section]}</span>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
        </div>
        <span className={`${styles.timer} ${timeWarn ? styles.timerWarn : ''}`}>
          {mm}:{ss}
        </span>
      </header>

      {/* 문항 */}
      <div className={styles.body}>
        <div className={`card ${styles.questionCard}`}>
          <div className={styles.questionMeta}>
            <span className={`chip chip--${level.toLowerCase()}`}>{level}</span>
            <span className={styles.questionNum}>{current + 1} / {examSet.length}</span>
          </div>

          {/* 청해: ttsText 표시 (TTS 버튼은 Phase 3에서 연결) */}
          {section === 'listening' && item.ttsText && (
            <div className={styles.ttsBox}>
              <span>🔊</span>
              <p className={styles.ttsText}>{item.ttsText}</p>
            </div>
          )}

          <p className={styles.question}>{item.question}</p>

          {/* 보기 */}
          <ul className={styles.choices}>
            {item.choices.map((choice, idx) => {
              const selected = answers[item.id] === idx;
              const correct  = revealed && idx === item.correctIndex;
              const wrong    = revealed && selected && idx !== item.correctIndex;
              return (
                <li key={idx}>
                  <button
                    className={`option ${selected ? 'option--selected' : ''} ${correct ? 'option--correct' : ''} ${wrong ? 'option--wrong' : ''}`}
                    onClick={() => handleSelect(item.id, idx)}
                  >
                    <span className="option__label">{String.fromCharCode(65 + idx)}</span>
                    <span className="option__text">{choice}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 해설 */}
          {revealed && (
            <div className={`${styles.explanation} ${answers[item.id] === item.correctIndex ? styles.correct : styles.wrong}`}>
              {answers[item.id] === item.correctIndex ? '✅' : '💡'} {item.explanation}
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="cta-bar">
        <button
          className="btn btn--primary"
          onClick={handleNext}
          disabled={!revealed && answers[item.id] === undefined}
        >
          {current < examSet.length - 1 ? '다음' : '제출'}
        </button>
      </div>
    </div>
  );
}

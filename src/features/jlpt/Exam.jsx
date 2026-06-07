import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthProvider';
import { db } from '../../services/firebase';
import { useJlptQuestions } from './hooks/useJlptQuestions';
import { scoreJlpt } from '../../utils/jlptScoring';
import { storage } from '../../utils/storage';

const SECTION_LABELS = { vocabulary:'어휘', grammar:'문법', reading:'독해', listening:'청해' };
const TOTAL_TIME = 60 * 60;

export default function JlptExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const level     = location.state?.level || 'N5';
  const { examSet, loading, error } = useJlptQuestions(level);

  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [revealed,  setRevealed]  = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(TOTAL_TIME);
  const [submitting,setSubmitting]= useState(false);
  const PROGRESS_KEY = `nm_jlpt_${level}`;

  useEffect(() => {
    const saved = storage.get(PROGRESS_KEY);
    if (saved?.level === level) { setAnswers(saved.answers||{}); setCurrent(saved.current||0); }
  }, [level]);

  useEffect(() => {
    if (examSet.length === 0) return;
    storage.set(PROGRESS_KEY, { level, answers, current });
  }, [answers, current, level, examSet]);

  useEffect(() => {
    if (loading || examSet.length === 0) return;
    const id = setInterval(() => setTimeLeft(t => { if (t <= 1) { clearInterval(id); handleSubmit(); return 0; } return t-1; }), 1000);
    return () => clearInterval(id);
  }, [loading, examSet]);

  useEffect(() => {
    const h = e => { e.preventDefault(); e.returnValue=''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const handleSelect = (id, idx) => {
    if (revealed) return;
    setAnswers(prev => {
      const next = {...prev};
      if (next[id] === idx) setRevealed(true);
      else { next[id] = idx; setRevealed(false); }
      return next;
    });
  };

  const handleNext = () => {
    setRevealed(false);
    if (current < examSet.length - 1) setCurrent(c => c+1);
    else handleSubmit();
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = scoreJlpt({ examSet, answers, level });
    try {
      const ref = await addDoc(collection(db,'users',user.uid,'results'), { type:'jlpt', level, ...result, createdAt: serverTimestamp() });
      storage.remove(PROGRESS_KEY);
      navigate(`/jlpt/result/${ref.id}`, { state:{result,level} });
    } catch {
      storage.remove(PROGRESS_KEY);
      navigate('/jlpt/result/local', { state:{result,level} });
    }
  }, [examSet, answers, level, user, submitting]);

  if (loading) return <div className="screen" style={{alignItems:'center',justifyContent:'center'}}><p style={{fontSize:'3rem'}}>🐱</p><p>문제 준비 중...</p></div>;
  if (error)   return <div className="screen" style={{alignItems:'center'}}><p>{error}</p><button className="btn btn--primary" onClick={()=>navigate('/jlpt')}>돌아가기</button></div>;

  const item = examSet[current];
  const sec  = item?.section || 'vocabulary';
  const pct  = Math.round(((current+1)/examSet.length)*100);
  const mm   = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const ss   = String(timeLeft%60).padStart(2,'0');

  return (
    <div>
      <div className="exam-header">
        <span className="exam-header__section">{SECTION_LABELS[sec]}</span>
        <div className="exam-header__progress">
          <div className="progress"><div className="progress__fill" style={{width:`${pct}%`}}/></div>
        </div>
        <span className={`exam-header__time ${timeLeft<300?'is-warning':''}`}>{mm}:{ss}</span>
      </div>

      <div className="screen">
        <div className="question-card">
          <div className="question-card__top">
            <span className={`chip chip--${level.toLowerCase()}`}>{level}</span>
            <span className="question-card__num">{current+1} / {examSet.length}</span>
          </div>
          {sec==='listening' && item.ttsText && (
            <div className="audio" style={{marginBottom:12}}>
              <span>🔊</span>
              <p style={{fontFamily:'var(--font-jp)',fontSize:'var(--fs-md)',marginLeft:8}}>{item.ttsText}</p>
            </div>
          )}
          <p className="question-card__text">{item.question}</p>
          <div className="options">
            {item.choices.map((choice, idx) => {
              const sel = answers[item.id]===idx;
              const cor = revealed && idx===item.correctIndex;
              const wrg = revealed && sel && idx!==item.correctIndex;
              return (
                <button key={idx}
                  className={`option ${sel?'is-selected':''} ${cor?'is-correct':''} ${wrg?'is-wrong':''}`}
                  onClick={()=>handleSelect(item.id, idx)}>
                  <span style={{fontWeight:700,marginRight:8}}>{String.fromCharCode(65+idx)}.</span>
                  {choice}
                </button>
              );
            })}
          </div>
          {revealed && (
            <div style={{marginTop:14,padding:'10px 14px',background:answers[item.id]===item.correctIndex?'var(--sage-l)':'var(--yellow-l)',borderRadius:'var(--r-md)',fontSize:'var(--fs-sm)',color:'var(--on-surface)'}}>
              {answers[item.id]===item.correctIndex?'✅':'💡'} {item.explanation}
            </div>
          )}
        </div>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block" onClick={handleNext}
          disabled={!revealed && answers[item.id]===undefined}>
          {current < examSet.length-1 ? '다음' : '제출'}
        </button>
      </div>
    </div>
  );
}

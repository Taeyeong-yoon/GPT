import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useExamGuard from '../../hooks/useExamGuard';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthProvider';
import { db } from '../../services/firebase';
import { incrementUsage } from '../../services/subscription';
import { useJlptQuestions } from './hooks/useJlptQuestions';
import { scoreJlpt } from '../../utils/jlptScoring';
import { storage } from '../../utils/storage';
import { speakListening } from '../../services/tts';

const SECTION_LABELS = { vocabulary:'어휘', grammar:'문법', reading:'독해', listening:'청해' };
const TOTAL_TIME = 60 * 60;

export default function JlptExam() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const level     = location.state?.level || 'N5';
  const { examSet, loading, error } = useJlptQuestions(level);

  const [current,    setCurrent]   = useState(0);
  const [answers,    setAnswers]   = useState({});
  const [revealed,   setRevealed]  = useState(false);
  const [timeLeft,   setTimeLeft]  = useState(TOTAL_TIME);
  const [submitting, setSubmitting]= useState(false);
  useExamGuard(!submitting); // 제출 완료 전까지 새로고침·뒤로가기 차단
  const [ttsPlaying, setTtsPlaying]= useState(false);
  const [playCount,  setPlayCount] = useState(0);
  const [ttsError,   setTtsError]  = useState('');
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
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(id); handleSubmit(); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [loading, examSet]);

  useEffect(() => {
    const h = e => { e.preventDefault(); e.returnValue=''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  useEffect(() => {
    if (examSet[current]?.section === 'listening') {
      setPlayCount(0);
      setTtsError('');
    }
  }, [current, examSet]);

  const handlePlay = useCallback(async (text, subType) => {
    if (ttsPlaying || !text) return;
    setTtsPlaying(true);
    setTtsError('');
    try {
      await speakListening(text, subType);
      setPlayCount(c => c + 1);
    } catch(e) {
      setTtsError('재생 실패 — 다시 눌러주세요');
    } finally {
      setTtsPlaying(false);
    }
  }, [ttsPlaying]);

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
      const ref = await addDoc(collection(db,'users',user.uid,'results'),
        { type:'jlpt', level, ...result, createdAt: serverTimestamp() });
      await incrementUsage(user.uid, 'jlpt');
      storage.remove(PROGRESS_KEY);
      navigate(`/jlpt/result/${ref.id}`, { state:{result,level} });
    } catch {
      storage.remove(PROGRESS_KEY);
      navigate('/jlpt/result/local', { state:{result,level} });
    }
  }, [examSet, answers, level, user, submitting]);

  if (loading) return (
    <div className="nm-app" style={{alignItems:'center',justifyContent:'center',gap:16}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #F9C8DA',borderTopColor:'#E05C8A',animation:'spin 0.7s linear infinite'}} /><p>문제 준비 중...</p>
    </div>
  );
  if (error) return (
    <div className="nm-app" style={{alignItems:'center',justifyContent:'center',gap:16}}>
      <p style={{color:'var(--danger)'}}>{error}</p>
      <button className="btn btn--primary" onClick={()=>navigate('/jlpt')}>돌아가기</button>
    </div>
  );

  const item = examSet[current];
  if (!item) return null;

  const sec = item.section || 'vocabulary';
  const pct = Math.round(((current+1)/examSet.length)*100);
  const mm  = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const ss  = String(timeLeft%60).padStart(2,'0');

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

          {sec === 'listening' && item.ttsText && (
            <div className={`audio ${ttsPlaying?'is-playing':''}`} style={{marginBottom:14}}>
              <button className="audio__btn" onClick={() => handlePlay(item.ttsText, item.subType)} disabled={ttsPlaying}>
                {ttsPlaying ? '⏸' : '▶'}
              </button>
              <div className="audio__wave"><span/><span/><span/><span/><span/></div>
              <span className="audio__count">{playCount===0 ? '▶ 눌러서 듣기' : `${playCount}회 재생`}</span>
            </div>
          )}
          {ttsError && <p style={{color:'var(--danger)',fontSize:'var(--fs-sm)',marginBottom:8}}>{ttsError}</p>}

          <p className="question-card__text">{item.question}</p>

          <div className="options">
            {item.choices.map((choice, idx) => {
              const sel = answers[item.id]===idx;
              const cor = revealed && idx===item.correctIndex;
              const wrg = revealed && sel && idx!==item.correctIndex;
              return (
                <button key={idx}
                  className={`option ${sel?'is-selected':''} ${cor?'is-correct':''} ${wrg?'is-wrong':''}`}
                  onClick={() => handleSelect(item.id, idx)}>
                  <span style={{fontWeight:700,marginRight:8}}>{String.fromCharCode(65+idx)}.</span>
                  {choice}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div style={{
              marginTop:12, padding:'10px 14px',
              background: answers[item.id]===item.correctIndex?'var(--sage-l)':'var(--yellow-l)',
              borderRadius:'var(--r-md)', fontSize:'var(--fs-sm)'
            }}>
              {answers[item.id]===item.correctIndex ? '✅' : '💡'} {item.explanation}
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthProvider';
import { db } from '../../services/firebase';
import { speakJapanese } from '../../services/tts';
import { useSjptFlow } from './hooks/useSjptFlow';
import { useRecorder } from './hooks/useRecorder';
import styles from './Exam.module.css';

const ANSWER_TIME = 60;  // 초
const PREP_TIME   = 15;  // Part2 준비 시간

export default function SjptExam() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const flow       = useSjptFlow();
  const recorder   = useRecorder();

  const [phase, setPhase] = useState('question'); // question | prep | recording | done
  const [countdown, setCountdown] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const timerRef = useRef(null);

  const isImagePart = flow.currentPart?.part === 2;

  // 문항 로드 시 TTS 자동 재생
  useEffect(() => {
    if (!flow.currentQuestion || flow.loading) return;
    setPhase('question');
    playTts(flow.currentQuestion.text);
  }, [flow.currentQuestion?.id]);

  const playTts = async (text) => {
    setTtsLoading(true);
    try { await speakJapanese(text); } catch {}
    setTtsLoading(false);
  };

  // 타이머
  const startTimer = useCallback((sec, onEnd) => {
    clearInterval(timerRef.current);
    setCountdown(sec);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); onEnd(); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleStartAnswer = useCallback(() => {
    if (isImagePart) {
      setPhase('prep');
      startTimer(PREP_TIME, () => {
        setPhase('recording');
        recorder.startRecording();
        startTimer(ANSWER_TIME, handleFinishAnswer);
      });
    } else {
      setPhase('recording');
      recorder.startRecording();
      startTimer(ANSWER_TIME, handleFinishAnswer);
    }
  }, [isImagePart, recorder, startTimer]);

  const handleFinishAnswer = useCallback(() => {
    clearInterval(timerRef.current);
    recorder.stopRecording();
    setPhase('done');
  }, [recorder]);

  const handleNext = useCallback(() => {
    flow.submitAnswer(recorder.transcript);
  }, [flow, recorder.transcript]);

  // 전 문항 완료 시 결과 저장 후 이동
  useEffect(() => {
    if (!flow.isDone || flow.answers.length === 0) return;

    const save = async () => {
      try {
        const docRef = await addDoc(
          collection(db, 'users', user.uid, 'results'),
          {
            type: 'sjpt', level: 'N3',
            answers: flow.answers,
            createdAt: serverTimestamp(),
          }
        );
        navigate(`/sjpt/result/${docRef.id}`, {
          state: { answers: flow.answers }
        });
      } catch {
        navigate('/sjpt/result/local', { state: { answers: flow.answers } });
      }
    };
    save();
  }, [flow.isDone]);

  if (flow.loading) return (
    <div className="splash-screen"><div className="splash-cat">🐱</div><p>문제 불러오는 중...</p></div>
  );
  if (flow.error) return (
    <div className="splash-screen">
      <p>문제를 불러오지 못했습니다: {flow.error}</p>
      <button className="btn btn--primary" onClick={() => navigate('/sjpt')}>돌아가기</button>
    </div>
  );

  const q = flow.currentQuestion;
  if (!q) return null;

  const progressText = `Part ${flow.currentPart?.part} · ${flow.totalAnswered + 1}/${flow.totalQuestions}`;

  return (
    <div className={styles.screen}>
      {/* 진행률 */}
      <header className="exam-header">
        <span className={styles.progress}>{progressText}</span>
        <div className="progress-bar">
          <div className="progress-bar__fill"
            style={{ width: `${(flow.totalAnswered / flow.totalQuestions) * 100}%` }} />
        </div>
      </header>

      <div className={styles.body}>
        {/* 질문 카드 */}
        <div className={`card ${styles.questionCard}`}>
          {/* Part 2 이미지 */}
          {isImagePart && q.imageUrl && (
            <img src={q.imageUrl} alt="문제 이미지" className={styles.image} />
          )}

          <p className={styles.question}>{q.text}</p>

          {/* TTS 다시 듣기 */}
          <button
            className={`btn btn--secondary ${styles.ttsBtn}`}
            onClick={() => playTts(q.text)}
            disabled={ttsLoading || recorder.isRecording}
          >
            {ttsLoading ? '재생 중...' : '🔊 다시 듣기'}
          </button>
        </div>

        {/* 준비 카운트다운 (Part2) */}
        {phase === 'prep' && (
          <div className={`card ${styles.countdownCard}`}>
            <p className={styles.countdownLabel}>준비 시간</p>
            <p className={styles.countdownNum}>{countdown}</p>
          </div>
        )}

        {/* 녹음 인터페이스 */}
        {phase === 'recording' && (
          <div className={`card ${styles.recCard}`}>
            <div className={styles.recMeter}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.recBar}
                  style={{ height: `${12 + Math.random() * 24}px` }} />
              ))}
            </div>
            <p className={styles.recTimer}>{countdown}초 남음</p>
            {recorder.transcript && (
              <p className={styles.sttPreview}>{recorder.transcript}</p>
            )}
            <button className="btn btn--primary" onClick={handleFinishAnswer}>
              답변 완료
            </button>
          </div>
        )}

        {/* 완료 후 다음 버튼 */}
        {phase === 'done' && (
          <div className={`card ${styles.doneCard}`}>
            {recorder.transcript
              ? <p className={styles.sttResult}>인식된 답변: {recorder.transcript}</p>
              : <p className={styles.sttResult}>답변이 인식되지 않았습니다.</p>
            }
            <button className="btn btn--primary" onClick={handleNext}>
              {flow.totalAnswered + 1 >= flow.totalQuestions ? '채점 요청' : '다음 문항'}
            </button>
          </div>
        )}

        {/* 시작 버튼 */}
        {phase === 'question' && (
          <div className="cta-bar">
            <button className="btn btn--primary" onClick={handleStartAnswer} disabled={ttsLoading}>
              {isImagePart ? '사진 보고 답변 시작' : '답변 시작'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

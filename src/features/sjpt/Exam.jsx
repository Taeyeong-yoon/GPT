import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthProvider";
import { db } from "../../services/firebase";
import { speakJapanese } from "../../services/tts";
import { useSjptFlow } from "./hooks/useSjptFlow";
import { useRecorder } from "./hooks/useRecorder";

const PREP_TIME = 15;
const ANSWER_TIME = 60;

export default function SjptExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const flow = useSjptFlow();
  const recorder = useRecorder();
  const [phase, setPhase] = useState("question");
  const [countdown, setCountdown] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const timerRef = useRef(null);
  const q = flow.currentQuestion;
  const part = flow.currentPart?.part || 1;

  useEffect(() => { setPhase("question"); setTtsLoading(false); }, [q?.id]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleSpeak = useCallback(async () => {
    if (!q?.text || ttsLoading) return;
    setTtsLoading(true);
    try { await speakJapanese(q.text, 'ja-JP-Neural2-C'); } catch {}
    setTtsLoading(false);
  }, [q, ttsLoading]);

  const startTimer = useCallback((sec, onEnd) => {
    clearInterval(timerRef.current);
    setCountdown(sec);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); onEnd(); return 0; } return c - 1; });
    }, 1000);
  }, []);

  const handleFinish = useCallback(() => {
    clearInterval(timerRef.current);
    recorder.stopRecording();
    setPhase("done");
  }, [recorder]);

  const handleStartAnswer = useCallback(() => {
    if (part === 2) {
      setPhase("prep");
      startTimer(PREP_TIME, () => {
        setPhase("recording");
        recorder.startRecording();
        startTimer(ANSWER_TIME, handleFinish);
      });
    } else {
      setPhase("recording");
      recorder.startRecording();
      startTimer(ANSWER_TIME, handleFinish);
    }
  }, [part, recorder, startTimer, handleFinish]);

  const handleNext = useCallback(() => {
    flow.submitAnswer(recorder.transcript);
  }, [flow, recorder.transcript]);

  useEffect(() => {
    if (!flow.isDone || flow.answers.length === 0) return;
    (async () => {
      try {
        const ref = await addDoc(collection(db, "users", user.uid, "results"), {
          type: "sjpt", level: "N3", answers: flow.answers, createdAt: serverTimestamp()
        });
        navigate("/sjpt/result/" + ref.id, { state: { answers: flow.answers } });
      } catch {
        navigate("/sjpt/result/local", { state: { answers: flow.answers } });
      }
    })();
  }, [flow.isDone]);

  if (flow.loading) return (
    <div className="nm-app" style={{alignItems:"center",justifyContent:"center",gap:16}}>
      <p style={{fontSize:"3rem"}}>🐱</p><p>문제 불러오는 중...</p>
    </div>
  );
  if (flow.error) return (
    <div className="nm-app" style={{alignItems:"center",justifyContent:"center",gap:16,padding:24}}>
      <p style={{color:"var(--danger)"}}>{flow.error}</p>
      <button className="btn btn--primary" onClick={() => navigate("/sjpt")}>돌아가기</button>
    </div>
  );
  if (!q) return null;

  const pct = Math.round((flow.totalAnswered / flow.totalQuestions) * 100);

  return (
    <div>
      <div className="exam-header">
        <span className="exam-header__section">제{part}부분 · {flow.totalAnswered + 1}/{flow.totalQuestions}</span>
        <div className="exam-header__progress">
          <div className="progress"><div className="progress__fill" style={{width: pct + "%"}}/></div>
        </div>
      </div>
      <div className="screen">
        <div className="question-card">
          {part === 2 && q.imageUrl && <img src={q.imageUrl} alt="문제 이미지" className="sjpt-image"/>}
          <p className="question-card__text" style={{marginBottom:12}}>{q.text}</p>
          <button className="btn btn--secondary btn--block" onClick={handleSpeak} disabled={ttsLoading}>
            {ttsLoading ? "재생 중..." : "🔊 문제 듣기"}
          </button>
        </div>

        {phase === "prep" && (
          <div className="card" style={{textAlign:"center",padding:"var(--sp-6)"}}>
            <p style={{marginBottom:8,color:"var(--on-surface-2)"}}>준비 시간</p>
            <div className="countdown">
              <div className="countdown__ring"/>
              <span className="countdown__num">{countdown}</span>
            </div>
          </div>
        )}

        {phase === "recording" && (
          <div className="card" style={{padding:"var(--sp-6)"}}>
            <div className="recorder">
              <div className="rec-meter">
                <span className="rec-meter__dot"/>
                <div className="rec-meter__wave"><span/><span/><span/><span/></div>
              </div>
              <p style={{fontVariantNumeric:"tabular-nums",fontWeight:"var(--fw-extra)",color:"var(--danger)"}}>{countdown}초 남음</p>
              {recorder.transcript && <p style={{fontSize:"var(--fs-sm)",color:"var(--on-surface-2)",textAlign:"center"}}>{recorder.transcript}</p>}
              <button className="btn btn--primary btn--block" onClick={handleFinish}>답변 완료</button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="card" style={{padding:"var(--sp-5)"}}>
            <p style={{marginBottom:12,fontSize:"var(--fs-sm)",color:"var(--on-surface-2)"}}>{recorder.transcript || "(답변이 인식되지 않았습니다)"}</p>
            <button className="btn btn--primary btn--block" onClick={handleNext}>
              {flow.totalAnswered + 1 >= flow.totalQuestions ? "채점 요청" : "다음 문항"}
            </button>
          </div>
        )}
      </div>

      {phase === "question" && (
        <div className="cta-bar">
          <button className="btn btn--primary btn--block" onClick={handleStartAnswer}>
            {part === 2 ? "사진 보고 답변 시작" : "답변 시작"}
          </button>
        </div>
      )}
    </div>
  );
}

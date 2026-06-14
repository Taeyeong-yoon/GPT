import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useExamGuard from '../../hooks/useExamGuard';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthProvider";
import { db } from "../../services/firebase";
import { incrementUsage } from "../../services/subscription";
import { speakJapanese } from "../../services/tts";
import { useSjptFlow } from "./hooks/useSjptFlow";
import { useRecorder } from "./hooks/useRecorder";
import nekoStudy      from "../../assets/neko-cats/neko-cat-01-study.png";
import nekoHeadset    from "../../assets/neko-cats/neko-cat-05-headset.png";
import nekoMicrophone from "../../assets/neko-cats/neko-cat-06-microphone.png";
import nekoSurprised  from "../../assets/neko-cats/neko-cat-07-surprised.png";
import nekoThinking   from "../../assets/neko-cats/neko-cat-08-thinking.png";
import nekoCelebrate  from "../../assets/neko-cats/neko-cat-09-celebrate.png";
import nekoTeacher    from "../../assets/neko-cats/neko-cat-11-teacher.png";

const PART_IMAGES = {
  1: nekoStudy,
  2: nekoHeadset,
  3: nekoMicrophone,
  4: nekoThinking,
  5: nekoTeacher,
  6: nekoSurprised,
  7: nekoCelebrate,
};

// 부 안내 문구 (1~7부)
const PART_INTRO = {
  1: "자신을 일본어로 소개하는 파트입니다. 준비 시간 없이 바로 녹음이 시작됩니다.",
  2: "화면에 제시된 그림을 보고 짧게 답하는 파트입니다.",
  3: "짧은 대화를 듣고 이어지는 말을 자연스럽게 완성하는 파트입니다.",
  4: "일상적인 주제에 대해 자신의 생각을 설명하는 파트입니다.",
  5: "주어진 주제에 대한 의견을 논리적으로 말하는 파트입니다.",
  6: "제시된 상황에 맞게 적절히 대응하는 파트입니다.",
  7: "연속된 그림을 보고 이야기를 구성하여 말하는 파트입니다.",
};

// 부분별 구성 · 준비 시간(초) · 답변 시간(초) — 실제 SJPT 기준
const PART_CONFIG = {
  1: { name: "자기소개",             kanji: "自己紹介",   prep: 0,  answer: 10 },
  2: { name: "그림 보고 답하기",       kanji: "簡単な応答", prep: 3,  answer: 6  },
  3: { name: "대화 완성",             kanji: "敏速な応答", prep: 2,  answer: 15 },
  4: { name: "일상 화제에 대해 설명하기", kanji: "短い応答",  prep: 15, answer: 25 },
  5: { name: "의견 제시",             kanji: "長い応答",   prep: 30, answer: 50 },
  6: { name: "상황 대응",             kanji: "場面設定",   prep: 30, answer: 40 },
  7: { name: "스토리 구성",           kanji: "連続した絵", prep: 30, answer: 90 },
};

function getPartConfig(part) {
  return PART_CONFIG[part] || { name: "", kanji: "", prep: 0, answer: 60 };
}

// 답변 시작 신호음 (삐 — Web Audio API, 별도 파일 불필요)
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {}
}

export default function SjptExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const flow = useSjptFlow();
  const recorder = useRecorder();
  const [phase, setPhase] = useState("question"); // question -> prep -> recording -> done
  const [examDone, setExamDone] = useState(false);
  useExamGuard(!examDone); // 제출 완료 전까지 새로고침·뒤로가기 차단
  const [countdown, setCountdown] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [showPartIntro, setShowPartIntro] = useState(true);
  const [doneLabel, setDoneLabel] = useState("registering"); // "registering" | "registered"
  const [textRevealed, setTextRevealed] = useState(false); // 이미지 문항: 문제듣기 클릭 시 자막 표시
  const timerRef = useRef(null);
  const handleNextRef = useRef(null);
  const q = flow.currentQuestion;
  const part = flow.currentPart?.part || 1;
  const cfg = getPartConfig(part);

  useEffect(() => { setPhase("question"); setTtsLoading(false); setDoneLabel("registering"); setTextRevealed(false); }, [q?.id]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startTimer = useCallback((sec, onEnd) => {
    clearInterval(timerRef.current);
    setCountdown(sec);
    if (sec <= 0) { onEnd(); return; }
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); onEnd(); return 0; } return c - 1; });
    }, 1000);
  }, []);

  const handleFinish = useCallback(() => {
    clearInterval(timerRef.current);
    recorder.stopRecording();
    setPhase("done");
  }, [recorder]);

  const beginRecording = useCallback(() => {
    playBeep();
    setPhase("recording");
    recorder.startRecording();
    startTimer(cfg.answer, handleFinish);
  }, [cfg.answer, recorder, startTimer, handleFinish]);

  // 문제 음성 재생 → (준비 시간) → 신호음 → 답변 녹음 자동 시작 (실제 시험과 동일한 흐름)
  const handleSpeak = useCallback(async () => {
    if (!q?.text || ttsLoading || phase !== "question") return;
    setTextRevealed(true); // 음성과 동시에 자막 표시
    setTtsLoading(true);
    try { await speakJapanese(q.text, 'ja-JP-Neural2-C'); } catch {}
    setTtsLoading(false);

    if (cfg.prep > 0) {
      setPhase("prep");
      startTimer(cfg.prep, beginRecording);
    } else {
      beginRecording();
    }
  }, [q, ttsLoading, phase, cfg.prep, startTimer, beginRecording]);

  const handleNext = useCallback(() => {
    const isLastQuestionOfPart =
      (flow.questionIdx + 1) >= (flow.currentPart?.questions?.length || 0);
    const isLastPart =
      (flow.partIdx + 1) >= (flow.parts?.length || 0);

    flow.submitAnswer(recorder.transcript);

    if (isLastQuestionOfPart && !isLastPart) {
      setShowPartIntro(true);
    }
  }, [flow, recorder.transcript]);

  // handleNext 최신 버전을 ref에 유지 (자동 진행 타이머에서 사용)
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // 답변 완료 시 자동 진행 — STT 완료 후에만 타이머 시작
  useEffect(() => {
    if (phase !== "done" || recorder.transcribing) return;
    const t1 = setTimeout(() => setDoneLabel("registered"), 1200);
    const t2 = setTimeout(() => handleNextRef.current?.(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, recorder.transcribing]);

  useEffect(() => {
    if (!flow.isDone || flow.answers.length === 0) return;
    (async () => {
      try {
        const ref = await addDoc(collection(db, "users", user.uid, "results"), {
          type: "sjpt", level: "N3", answers: flow.answers, createdAt: serverTimestamp()
        });
        await incrementUsage(user.uid, 'sjpt');
        setExamDone(true);
        navigate("/sjpt/result/" + ref.id, { state: { answers: flow.answers } });
      } catch {
        setExamDone(true);
        navigate("/sjpt/result/local", { state: { answers: flow.answers } });
      }
    })();
  }, [flow.isDone]);

  if (flow.loading) return (
    <div className="nm-app" style={{alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #F9C8DA',borderTopColor:'#E05C8A',animation:'spin 0.7s linear infinite'}} /><p>문제 불러오는 중...</p>
    </div>
  );
  if (flow.error) return (
    <div className="nm-app" style={{alignItems:"center",justifyContent:"center",gap:16,padding:24}}>
      <p style={{color:"var(--danger)"}}>{flow.error}</p>
      <button className="btn btn--primary" onClick={() => navigate("/sjpt")}>돌아가기</button>
    </div>
  );
  if (!q && !showPartIntro) return null;

  // 부 안내 화면 (1부 시작 + 2~7부 전환)
  if (showPartIntro) {
    const introPart = flow.currentPart?.part || 1;
    const introCfg  = getPartConfig(introPart);
    const isFirst   = introPart === 1;
    return (
      <div className="screen sjpt-part-intro">
        <p className="sjpt-part-intro__label">
          {isFirst ? "지금부터 시작합니다" : "이제부터"}
        </p>
        <img
          src={PART_IMAGES[introPart] || nekoStudy}
          alt=""
          className="sjpt-part-intro__cat"
        />
        <div className="sjpt-part-intro__part">
          <span className="sjpt-part-intro__num">제{introPart}부</span>
          <span className="sjpt-part-intro__name">{introCfg.name}</span>
          {introCfg.kanji && (
            <span className="sjpt-part-intro__kanji">{introCfg.kanji}</span>
          )}
        </div>
        <p className="sjpt-part-intro__desc">{PART_INTRO[introPart]}</p>
        <p className="sjpt-part-intro__timing">
          준비 시간&nbsp;{introCfg.prep > 0 ? `${introCfg.prep}초` : '없음'}
          &nbsp;·&nbsp;
          답변 시간&nbsp;{introCfg.answer}초
        </p>
        <button
          className="btn btn--primary"
          style={{ minWidth: 200, marginTop: 'var(--sp-4)' }}
          onClick={() => setShowPartIntro(false)}
        >
          시작하기 →
        </button>
      </div>
    );
  }

  const pct = Math.round((flow.totalAnswered / flow.totalQuestions) * 100);

  return (
    <div>
      <div className="exam-header">
        <span className="exam-header__section">
          제{part}부 · {cfg.name}{cfg.kanji ? `(${cfg.kanji})` : ""} · {flow.totalAnswered + 1}/{flow.totalQuestions}
        </span>
        <div className="exam-header__progress">
          <div className="progress"><div className="progress__fill" style={{width: pct + "%"}}/></div>
        </div>
      </div>
      <div className="screen">
        <div className="question-card">
          {q.imageUrl && <img key={q.id} src={q.imageUrl} alt="문제 이미지" className="sjpt-image"/>}
          {(!q.imageUrl || textRevealed) && (
            <p className="question-card__text" style={{marginBottom:12}}>{q.text}</p>
          )}
          {phase === "question" && (
            <button className="btn btn--secondary btn--block" onClick={handleSpeak} disabled={ttsLoading}>
              {ttsLoading ? "재생 중..." : "🔊 문제 듣기"}
            </button>
          )}
          {phase === "question" && (
            <p style={{marginTop:8,fontSize:"var(--fs-xs)",color:"var(--on-surface-3)",textAlign:"center"}}>
              {q.imageUrl && !textRevealed
                ? "버튼을 누르면 음성과 함께 문제 자막이 표시됩니다"
                : "준비 시간 후 신호음과 함께 답변이 자동으로 시작됩니다"}
            </p>
          )}
        </div>

        {phase === "prep" && (
          <div className="card" style={{textAlign:"center",padding:"var(--sp-6)"}}>
            <p style={{marginBottom:8,color:"var(--on-surface-2)"}}>준비 시간 — 곧 신호음과 함께 답변이 시작됩니다</p>
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
            {recorder.transcribing && (
              <p style={{marginBottom:12,fontSize:"var(--fs-sm)",color:"var(--on-surface-3)",textAlign:"center"}}>
                🎙️ 음성 인식 중...
              </p>
            )}
            {!recorder.transcribing && recorder.transcript && (
              <p style={{marginBottom:12,fontSize:"var(--fs-sm)",color:"var(--on-surface-2)",lineHeight:1.6}}>
                {recorder.transcript}
              </p>
            )}
            {!recorder.transcribing && (
              doneLabel === "registering" ? (
                <p style={{fontSize:"var(--fs-sm)",color:"var(--on-surface-3)",textAlign:"center"}}>
                  답변을 등록하고 있습니다...
                </p>
              ) : (
                <p style={{fontSize:"var(--fs-sm)",color:"var(--success,#2e7d32)",fontWeight:"var(--fw-semi)",textAlign:"center"}}>
                  등록이 완료되었습니다 ✓
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

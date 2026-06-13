import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSubscriptionGuard from '../../hooks/useSubscriptionGuard';
import nekoStudy from '../../assets/neko-cats/neko-cat-01-study.png';
import nekoHeadset from '../../assets/neko-cats/neko-cat-05-headset.png';
import nekoMicrophone from '../../assets/neko-cats/neko-cat-06-microphone.png';
import nekoSurprised from '../../assets/neko-cats/neko-cat-07-surprised.png';
import nekoThinking from '../../assets/neko-cats/neko-cat-08-thinking.png';
import nekoCelebrate from '../../assets/neko-cats/neko-cat-09-celebrate.png';
import nekoTeacher from '../../assets/neko-cats/neko-cat-11-teacher.png';

const PART_IMAGES = {
  1: nekoStudy,
  2: nekoHeadset,
  3: nekoMicrophone,
  4: nekoThinking,
  5: nekoTeacher,
  6: nekoSurprised,
  7: nekoCelebrate,
};

// 구성 · 준비/답변 시간(초) · 문항수 — 실제 SJPT 기준 (Exam.jsx의 PART_CONFIG와 동일)
const PART_INFO = {
  1: { name:'자기소개',             kanji:'自己紹介',   prep:0,  answer:10, count:4 },
  2: { name:'그림 보고 답하기',       kanji:'簡単な応答', prep:3,  answer:6,  count:4 },
  3: { name:'대화 완성',             kanji:'敏速な応答', prep:2,  answer:15, count:5 },
  4: { name:'일상 화제에 대해 설명하기', kanji:'短い応答',  prep:15, answer:25, count:5 },
  5: { name:'의견 제시',             kanji:'長い応答',   prep:30, answer:50, count:4 },
  6: { name:'상황 대응',             kanji:'場面設定',   prep:30, answer:40, count:3 },
  7: { name:'스토리 구성',           kanji:'連続した絵', prep:30, answer:90, count:1 },
};

export default function SjptSetup() {
  const navigate = useNavigate();
  const [micOk,   setMicOk]   = useState(null);
  const [testing, setTesting] = useState(false);
  const [parts,   setParts]   = useState([]);
  const guard = useSubscriptionGuard('sjpt');

  useEffect(() => {
    fetch('/api/sjpt-questions')
      .then(r => r.json())
      .then(d => { if (d.ok) setParts(d.parts); })
      .catch(() => {});
  }, []);

  const testMic = useCallback(async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicOk(true);
    } catch { setMicOk(false); }
    finally   { setTesting(false); }
  }, []);

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">SJPT 모의고사</h2>
        <p className="screen__sub">
          1부~7부 실전 대비
        </p>
      </div>

      <div className="part-preview">
        {(parts.length > 0 ? parts : Object.keys(PART_INFO).map(n=>({part:+n}))).map(p => {
          const info = PART_INFO[p.part] || { name:`${p.part}부`, kanji:'', prep:0, answer:60, count:p.questions?.length || 0 };
          return (
            <div key={p.part} className="part-tile">
              <img src={PART_IMAGES[p.part] || nekoStudy} alt="" className="part-tile__cat-img" />
              <div className="stack" style={{gap:2}}>
                <p className="part-tile__name">제{p.part}부 · {info.name}{info.kanji ? `(${info.kanji})` : ''}</p>
                <p className="part-tile__count">
                  준비 {info.prep}초 · 답변 {info.answer}초 · {info.count}문항
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mic-status ${micOk===true?'is-on':micOk===false?'is-off':''}`}>
        <span className="dot"/>
        <span>
          {micOk===null  && '마이크 테스트 (선택사항)'}
          {micOk===true  && '마이크 정상 작동 ✅'}
          {micOk===false && '마이크 사용 불가 ⚠️'}
        </span>
      </div>

      <button className="btn btn--secondary btn--block" onClick={testMic} disabled={testing}>
        {testing ? '확인 중...' : '🎙 마이크 테스트'}
      </button>

      <div className="stack gap-2">
        <p className="env-tip">🎧 이어폰 착용 권장</p>
        <p className="env-tip">🤫 조용한 환경에서 응시하세요</p>
        <p className="env-tip">⏱️ 부분마다 준비·답변 시간이 다릅니다 (위 카드 참고)</p>
      </div>

      {!guard.loading && !guard.isPro && (
        <div className="sub-gate sub-gate--locked">
          <p className="sub-gate__icon">🔒</p>
          <p className="sub-gate__title">Pro 구독이 필요합니다</p>
          <p className="sub-gate__desc">SJPT 말하기 평가는 Pro 구독자만 이용 가능합니다.<br />네코짱 앱에서 구독 후 이용해주세요.</p>
        </div>
      )}
      {!guard.loading && guard.isPro && !guard.canStart && (
        <div className="sub-gate sub-gate--exhausted">
          <p className="sub-gate__icon">📅</p>
          <p className="sub-gate__title">이번 달 횟수를 모두 사용했습니다</p>
          <p className="sub-gate__desc">SJPT 말하기 평가는 월 {guard.limit}회 제공됩니다.<br />({guard.used}/{guard.limit}회 사용) 다음 달에 다시 응시할 수 있습니다.</p>
        </div>
      )}

      <div className="cta-bar">
        {!guard.loading && guard.isPro && (
          <p className="sub-usage">이번 달 SJPT 응시 {guard.used}/{guard.limit}회</p>
        )}
        <button
          className="btn btn--primary btn--block"
          disabled={guard.loading || !guard.canStart}
          onClick={() => navigate('/sjpt/exam')}
        >
          {guard.loading ? '확인 중...' : !guard.isPro ? '구독 필요' : !guard.canStart ? '횟수 초과' : '시작하기'}
        </button>
      </div>
    </div>
  );
}

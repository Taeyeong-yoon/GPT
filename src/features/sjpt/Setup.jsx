import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CatIcon, { PART_MOODS } from '../../components/CatIcon';

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
          {parts.length > 0 ? `${parts.length}개 부분 · L1~L9` : '로딩 중...'}
        </p>
      </div>

      <div className="part-preview">
        {(parts.length > 0 ? parts : Object.keys(PART_INFO).map(n=>({part:+n}))).map(p => {
          const info = PART_INFO[p.part] || { name:`${p.part}부`, kanji:'', prep:0, answer:60, count:p.questions?.length || 0 };
          return (
            <div key={p.part} className="part-tile">
              <CatIcon mood={PART_MOODS[p.part] || 'wave'} size={44}/>
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

      <div className="cta-bar">
        <button className="btn btn--primary btn--block" onClick={() => navigate('/sjpt/exam')}>
          시작하기
        </button>
      </div>
    </div>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PART_INFO = {
  1: { icon:'👤', label:'자기소개·기본 질문', note:'고정 4문항' },
  2: { icon:'🖼️', label:'사진 묘사', note:'이미지' },
  3: { icon:'🎭', label:'상황 대응', note:'이미지' },
  4: { icon:'💬', label:'일상 대화·의견', note:'' },
  5: { icon:'💡', label:'의견 제시', note:'' },
  6: { icon:'🎯', label:'롤플레이', note:'' },
  7: { icon:'📖', label:'스토리텔링', note:'' },
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
          const info = PART_INFO[p.part] || { icon:'📝', label:`${p.part}부분` };
          const hasImg = p.questions?.some(q => q.imageUrl);
          return (
            <div key={p.part} className="part-tile">
              <span className="part-tile__ico">{info.icon}</span>
              <p className="part-tile__name">제{p.part}부분</p>
              <p className="part-tile__count">
                {info.label}{hasImg ? ' 🖼️' : ''}{info.note ? ` (${info.note})` : ''}
              </p>
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
        <p className="env-tip">⏱️ 부분별 60초 답변 시간</p>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block" onClick={() => navigate('/sjpt/exam')}>
          시작하기
        </button>
      </div>
    </div>
  );
}

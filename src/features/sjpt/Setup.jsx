import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const PARTS = [
  { part:1, icon:'👤', label:'기본 질문',  desc:'자기소개 등 2문항' },
  { part:2, icon:'🖼️', label:'사진 묘사',  desc:'이미지 보고 설명 2문항' },
  { part:3, icon:'🎭', label:'상황 대응',  desc:'롤플레이 2문항' },
  { part:4, icon:'💡', label:'의견 제시',  desc:'자신의 생각 2문항' },
];

export default function SjptSetup() {
  const navigate = useNavigate();
  const [micOk, setMicOk]     = useState(null);
  const [testing, setTesting] = useState(false);

  const testMic = useCallback(async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicOk(true);
    } catch {
      setMicOk(false);
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">SJPT 모의고사</h2>
        <p className="screen__sub">일본어 말하기 시험 8문항</p>
      </div>

      <div className="part-preview">
        {PARTS.map(p => (
          <div key={p.part} className="part-tile">
            <span className="part-tile__ico">{p.icon}</span>
            <p className="part-tile__name">Part {p.part} {p.label}</p>
            <p className="part-tile__count">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className={`mic-status ${micOk===true?'is-on':micOk===false?'is-off':''}`}>
        <span className="dot"/>
        <span>
          {micOk===null  && '마이크 테스트 (선택사항)'}
          {micOk===true  && '마이크 정상 작동 ✅'}
          {micOk===false && '마이크를 사용할 수 없습니다 ⚠️'}
        </span>
      </div>

      <button className="btn btn--secondary btn--block" onClick={testMic} disabled={testing}>
        {testing ? '확인 중...' : '🎙 마이크 테스트'}
      </button>

      <div className="stack gap-2">
        <p className="env-tip">🎧 이어폰 착용 권장</p>
        <p className="env-tip">🤫 조용한 환경에서 응시하세요</p>
      </div>

      <div className="cta-bar">
        <button className="btn btn--primary btn--block" onClick={() => navigate('/sjpt/exam')}>
          시작하기
        </button>
      </div>
    </div>
  );
}

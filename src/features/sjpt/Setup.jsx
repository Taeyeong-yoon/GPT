import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecorder } from './hooks/useRecorder';
import styles from './Setup.module.css';

const PARTS = [
  { part: 1, icon: '👤', label: '기본 질문',    desc: '자기소개 등 2문항' },
  { part: 2, icon: '🖼️', label: '사진 묘사',    desc: '이미지 보고 설명 2문항' },
  { part: 3, icon: '🎭', label: '상황 대응',    desc: '롤플레이 2문항' },
  { part: 4, icon: '💡', label: '의견 제시',    desc: '자신의 생각 2문항' },
];

export default function SjptSetup() {
  const navigate = useNavigate();
  const { startRecording, stopRecording, isRecording, error: recError } = useRecorder();
  const [micOk, setMicOk] = useState(null); // null | true | false
  const [testing, setTesting] = useState(false);

  const testMic = useCallback(async () => {
    setTesting(true);
    try {
      await startRecording();
      setTimeout(async () => {
        stopRecording();
        setMicOk(true);
        setTesting(false);
      }, 2000);
    } catch {
      setMicOk(false);
      setTesting(false);
    }
  }, [startRecording, stopRecording]);

  return (
    <div className={styles.screen}>
      <header className="screen-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>SJPT 모의고사</h1>
      </header>

      {/* 파트 안내 */}
      <div className={`card ${styles.partCard}`}>
        <h2 className={styles.sectionTitle}>파트 구성 (총 8문항)</h2>
        <ul className={styles.partList}>
          {PARTS.map(p => (
            <li key={p.part} className={styles.partTile}>
              <span className={styles.partIcon}>{p.icon}</span>
              <div>
                <p className={styles.partLabel}>Part {p.part} — {p.label}</p>
                <p className={styles.partDesc}>{p.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 마이크 상태 */}
      <div className={`card ${styles.micCard}`}>
        <h2 className={styles.sectionTitle}>마이크 확인</h2>
        <div className={`${styles.micStatus} ${micOk === true ? styles.micOk : micOk === false ? styles.micFail : ''}`}>
          {micOk === null  && '🎙️ 아직 확인 안 됨'}
          {micOk === true  && '🟢 마이크 정상 작동'}
          {micOk === false && '🔴 마이크를 사용할 수 없습니다'}
        </div>
        {recError && <p className={styles.micError}>{recError}</p>}
        <button className="btn btn--secondary" onClick={testMic} disabled={testing || isRecording}>
          {testing ? '테스트 중 (2초)...' : '마이크 테스트'}
        </button>
      </div>

      {/* 환경 안내 */}
      <div className={`card ${styles.tipCard}`}>
        <p className={styles.tip}>🎧 이어폰 착용 권장</p>
        <p className={styles.tip}>🤫 조용한 환경에서 응시하세요</p>
        <p className={styles.tip}>⏱️ 각 문항은 답변 시간이 제한됩니다</p>
      </div>

      <div className="cta-bar">
        <button
          className="btn btn--primary"
          onClick={() => navigate('/sjpt/exam')}
          disabled={micOk !== true}
        >
          {micOk !== true ? '마이크 테스트 후 시작' : '시작하기'}
        </button>
      </div>
    </div>
  );
}

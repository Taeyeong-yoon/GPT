import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LevelSelect.module.css';

const LEVELS = [
  { code: 'N5', label: 'N5', desc: '입문', time: '60분', questions: 40, chipClass: 'chip--n5' },
  { code: 'N4', label: 'N4', desc: '초급', time: '60분', questions: 40, chipClass: 'chip--n4' },
  { code: 'N3', label: 'N3', desc: '중급 하', time: '60분', questions: 40, chipClass: 'chip--n3' },
  { code: 'N2', label: 'N2', desc: '중급 상', time: '60분', questions: 40, chipClass: 'chip--n2' },
  { code: 'N1', label: 'N1', desc: '고급', time: '60분', questions: 40, chipClass: 'chip--n1' },
];

export default function LevelSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState(null);

  const handleStart = () => {
    if (!selected) return;
    navigate('/jlpt/exam', { state: { level: selected } });
  };

  return (
    <div className={styles.screen}>
      <header className="screen-header">
        <button onClick={() => navigate('/')}>←</button>
        <h1>JLPT 모의고사</h1>
      </header>

      <p className={styles.guide}>어떤 레벨로 도전할까요?</p>

      <ul className={styles.list}>
        {LEVELS.map(lv => (
          <li key={lv.code}>
            <button
              className={`card ${styles.card} ${selected === lv.code ? styles.active : ''}`}
              onClick={() => setSelected(lv.code)}
            >
              <span className={`chip ${lv.chipClass}`}>{lv.label}</span>
              <div className={styles.cardBody}>
                <span className={styles.desc}>{lv.desc}</span>
                <span className={styles.meta}>{lv.questions}문항 · {lv.time}</span>
              </div>
              <span className={styles.arrow}>›</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="cta-bar">
        <button
          className="btn btn--primary"
          onClick={handleStart}
          disabled={!selected}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LEVELS = [
  { code:'N5', meta:'40문항 · 60분', cls:'level-card--n5' },
  { code:'N4', meta:'40문항 · 60분', cls:'level-card--n4' },
  { code:'N3', meta:'40문항 · 60분', cls:'level-card--n3' },
  { code:'N2', meta:'40문항 · 60분', cls:'level-card--n2' },
  { code:'N1', meta:'40문항 · 60분', cls:'level-card--n1' },
];

export default function LevelSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">JLPT 모의고사</h2>
        <p className="screen__sub">레벨을 선택하세요</p>
      </div>

      <div className="levels">
        {LEVELS.map(lv => (
          <button
            key={lv.code}
            className={`level-card ${lv.cls} ${selected === lv.code ? 'is-selected' : ''}`}
            onClick={() => setSelected(lv.code)}
          >
            <span className={`chip chip--${lv.code.toLowerCase()}`}>{lv.code}</span>
            <div>
              <p className="level-card__name">{lv.code}</p>
              <p className="level-card__meta">{lv.meta}</p>
            </div>
            <span className="level-card__arrow">›</span>
          </button>
        ))}
      </div>

      <div className="cta-bar">
        <button
          className="btn btn--primary btn--block"
          disabled={!selected}
          onClick={() => navigate('/jlpt/exam', { state: { level: selected } })}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

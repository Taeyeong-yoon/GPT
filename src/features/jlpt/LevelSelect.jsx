import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CatIcon from '../../components/CatIcon';

const LEVELS = [
  { code:'N5', meta:'입문',     desc:'40문항 · 60분', mood:'wave',     cls:'level-card--n5' },
  { code:'N4', meta:'초급',     desc:'40문항 · 60분', mood:'look',     cls:'level-card--n4' },
  { code:'N3', meta:'중급',     desc:'40문항 · 60분', mood:'chill',    cls:'level-card--n3' },
  { code:'N2', meta:'중상급',   desc:'40문항 · 60분', mood:'think',    cls:'level-card--n2' },
  { code:'N1', meta:'상급',     desc:'40문항 · 60분', mood:'story',    cls:'level-card--n1' },
];

export default function LevelSelect() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [selected, setSelected] = useState(state?.level ?? null);

  return (
    <div className="screen screen--cta-pad">
      <div>
        <h2 className="screen__title">JLPT 모의고사</h2>
        <p className="screen__sub">네코짱과 함께 응시할 레벨을 골라보세요</p>
      </div>

      <div className="levels">
        {LEVELS.map(lv => (
          <button
            key={lv.code}
            className={`level-card ${lv.cls} ${selected === lv.code ? 'is-selected' : ''}`}
            onClick={() => setSelected(lv.code)}
          >
            <CatIcon mood={lv.mood} size={40}/>
            <p className="level-card__name">{lv.code}</p>
            <p className="level-card__meta">{lv.meta}</p>
            <p className="level-card__desc">{lv.desc}</p>
          </button>
        ))}
      </div>

      <div className="cta-bar">
        <button
          className="btn btn--primary btn--block"
          disabled={!selected}
          onClick={() => navigate('/jlpt/exam', { state: { level: selected } })}
        >
          {selected ? `${selected} 시작하기` : '레벨을 선택해주세요'}
        </button>
      </div>
    </div>
  );
}

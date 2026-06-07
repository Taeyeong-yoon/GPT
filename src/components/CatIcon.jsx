import React from 'react';

// 부분별 "네코짱" 표정 뱃지 — 이모지 대신 사용하는 손그림풍 고양이 얼굴
// mood로 눈/입 모양과 포인트 컬러만 바꿔 7가지 표정을 표현한다
const MOODS = {
  wave:     { bg:'#FFD6E4', ear:'#F77FAA', eyes:'dot',    mouth:'smile',  accent:'👋' },
  look:     { bg:'#EAE4F8', ear:'#C5B8E8', eyes:'round',  mouth:'o',      accent:null },
  chat:     { bg:'#D4ECD9', ear:'#9DC4A8', eyes:'wink',   mouth:'open',   accent:'💬' },
  chill:    { bg:'#FFF5CC', ear:'#FFD86B', eyes:'arc',    mouth:'smile',  accent:null },
  think:    { bg:'#FFE3D1', ear:'#F6B496', eyes:'side',   mouth:'small',  accent:'💭' },
  surprise: { bg:'#D6ECF8', ear:'#8FC3E6', eyes:'big',    mouth:'o',      accent:null },
  story:    { bg:'#F3D9FF', ear:'#D9A6F2', eyes:'star',   mouth:'grin',   accent:'✨' },
};

function Eyes({ type }) {
  switch (type) {
    case 'round':
      return <><circle cx="17" cy="22" r="3.4" fill="#3A2E2E"/><circle cx="31" cy="22" r="3.4" fill="#3A2E2E"/>
        <circle cx="18.2" cy="20.8" r="1" fill="#fff"/><circle cx="32.2" cy="20.8" r="1" fill="#fff"/></>;
    case 'wink':
      return <><path d="M14 22 q3 -2.6 6 0" stroke="#3A2E2E" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <circle cx="31" cy="22" r="3" fill="#3A2E2E"/><circle cx="32.1" cy="20.9" r="0.9" fill="#fff"/></>;
    case 'arc':
      return <><path d="M14 21.5 q3 3 6 0" stroke="#3A2E2E" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M28 21.5 q3 3 6 0" stroke="#3A2E2E" strokeWidth="2" fill="none" strokeLinecap="round"/></>;
    case 'side':
      return <><circle cx="19" cy="21.5" r="2.6" fill="#3A2E2E"/><circle cx="33" cy="21.5" r="2.6" fill="#3A2E2E"/>
        <circle cx="19.9" cy="20.6" r="0.8" fill="#fff"/><circle cx="33.9" cy="20.6" r="0.8" fill="#fff"/></>;
    case 'big':
      return <><circle cx="17" cy="22" r="4" fill="#3A2E2E"/><circle cx="31" cy="22" r="4" fill="#3A2E2E"/>
        <circle cx="18.4" cy="20.6" r="1.3" fill="#fff"/><circle cx="32.4" cy="20.6" r="1.3" fill="#fff"/></>;
    case 'star':
      return <><path d="M17 19l1.1 2.3 2.5.4-1.8 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.8 2.5-.4z" fill="#3A2E2E"/>
        <path d="M31 19l1.1 2.3 2.5.4-1.8 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.8 2.5-.4z" fill="#3A2E2E"/></>;
    case 'dot':
    default:
      return <><circle cx="17" cy="22" r="2.6" fill="#3A2E2E"/><circle cx="31" cy="22" r="2.6" fill="#3A2E2E"/>
        <circle cx="18" cy="21" r="0.8" fill="#fff"/><circle cx="32" cy="21" r="0.8" fill="#fff"/></>;
  }
}

function Mouth({ type }) {
  switch (type) {
    case 'o':      return <ellipse cx="24" cy="29.5" rx="2.2" ry="2.6" fill="#E78A8A"/>;
    case 'open':   return <path d="M20.5 28.5 q3.5 5 7 0" stroke="#3A2E2E" strokeWidth="1.8" fill="#FFD0D0" strokeLinecap="round"/>;
    case 'small':  return <path d="M22.5 29.5 q1.5 1.4 3 0" stroke="#3A2E2E" strokeWidth="1.6" fill="none" strokeLinecap="round"/>;
    case 'grin':   return <path d="M19 28 q5 5.5 10 0" stroke="#3A2E2E" strokeWidth="1.8" fill="#FFD0D0" strokeLinecap="round"/>;
    case 'smile':
    default:       return <path d="M20 28.5 q4 3.4 8 0" stroke="#3A2E2E" strokeWidth="1.8" fill="none" strokeLinecap="round"/>;
  }
}

export default function CatIcon({ mood = 'wave', size = 40, className = '' }) {
  const m = MOODS[mood] || MOODS.wave;
  return (
    <span className={`cat-icon ${className}`} style={{ width: size, height: size, background: m.bg }}>
      <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
        {/* 귀 */}
        <path d="M11 14 L17 6 L20 17 Z" fill="#FBC9A4"/>
        <path d="M37 14 L31 6 L28 17 Z" fill="#FBC9A4"/>
        <path d="M13.4 13.6 L17 9 L18.6 15.4 Z" fill={m.ear}/>
        <path d="M34.6 13.6 L31 9 L29.4 15.4 Z" fill={m.ear}/>
        {/* 얼굴 */}
        <ellipse cx="24" cy="25" rx="14" ry="12.5" fill="#FFF6EC"/>
        <Eyes type={m.eyes}/>
        <Mouth type={m.mouth}/>
        {/* 수염 */}
        <path d="M9 25h5M9 29h5M34 25h5M34 29h5" stroke="#E8C9B0" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      {m.accent && <span className="cat-icon__accent">{m.accent}</span>}
    </span>
  );
}

export const PART_MOODS = {
  1: 'wave',     // 자기소개 — 인사하는 표정
  2: 'look',     // 그림 보고 답하기 — 호기심 가득한 큰 눈
  3: 'chat',     // 대화 완성 — 윙크하며 대화하는 표정
  4: 'chill',    // 일상 화제 — 편안한 미소
  5: 'think',    // 의견 제시 — 생각하는 표정
  6: 'surprise', // 상황 대응 — 깜짝 놀란 표정
  7: 'story',    // 스토리 구성 — 반짝이는 별 눈, 신난 표정
};

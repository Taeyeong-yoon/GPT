import React from 'react';

// 네코짱 고양이 캐릭터 — 뾰족한 귀, 하트 코, 볼터치, 수염
// mood로 눈·입·배경색을 바꿔 9가지 표정 표현
const SKIN = '#FFF0E2';

const MOODS = {
  wave:       { bg:'#FFD6E4', ear:'#F77FAA', cheek:'rgba(255,120,160,0.30)', eyes:'dot',        mouth:'smile', accent:'👋' },
  look:       { bg:'#EAE4F8', ear:'#C5B8E8', cheek:'rgba(160,140,210,0.28)', eyes:'round',      mouth:'small', accent:null },
  heart:      { bg:'#FFE4EE', ear:'#F77FAA', cheek:'rgba(255,80,120,0.35)',  eyes:'heart',      mouth:'smile', accent:null },
  sunglasses: { bg:'#FFF5CC', ear:'#FFD86B', cheek:'rgba(220,160,40,0.30)',  eyes:'sunglasses', mouth:'grin',  accent:null },
  wink:       { bg:'#D4ECD9', ear:'#9DC4A8', cheek:'rgba(80,170,100,0.28)',  eyes:'wink',       mouth:'smile', accent:null },
  chill:      { bg:'#FFF5CC', ear:'#FFD86B', cheek:'rgba(220,160,40,0.25)',  eyes:'arc',        mouth:'smile', accent:null },
  think:      { bg:'#FFE3D1', ear:'#F6B496', cheek:'rgba(220,110,70,0.28)',  eyes:'side',       mouth:'small', accent:'💭' },
  surprise:   { bg:'#D6ECF8', ear:'#8FC3E6', cheek:'rgba(60,150,210,0.28)', eyes:'big',        mouth:'o',     accent:null },
  star:       { bg:'#F3D9FF', ear:'#D9A6F2', cheek:'rgba(160,80,230,0.28)', eyes:'star',       mouth:'grin',  accent:'✨' },
};

function Eyes({ type }) {
  switch (type) {

    case 'heart':
      return <>
        <path d="M15 23.5 C15 21.5 17 20.5 18 22.5 C19 20.5 21 21.5 21 23.5 C21 26 18 28 18 28 C18 28 15 26 15 23.5 Z" fill="#FF5C8A"/>
        <path d="M27 23.5 C27 21.5 29 20.5 30 22.5 C31 20.5 33 21.5 33 23.5 C33 26 30 28 30 28 C30 28 27 26 27 23.5 Z" fill="#FF5C8A"/>
      </>;

    case 'sunglasses':
      return <>
        <rect x="11" y="21" width="13" height="8" rx="3.5" fill="#222"/>
        <rect x="26" y="21" width="13" height="8" rx="3.5" fill="#222"/>
        <rect x="24" y="24" width="2" height="2.5" rx="1" fill="#444"/>
        <path d="M12.5 23 L15 24" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
        <path d="M27.5 23 L30 24" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
      </>;

    case 'wink':
      return <>
        <path d="M15 24 Q18 21 21 24" stroke="#3A2E2E" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <circle cx="30" cy="23.5" r="3.4" fill="#3A2E2E"/>
        <circle cx="31.3" cy="22.2" r="1.1" fill="#fff"/>
      </>;

    case 'arc':
      return <>
        <path d="M15 23 Q18 26.5 21 23" stroke="#3A2E2E" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        <path d="M27 23 Q30 26.5 33 23" stroke="#3A2E2E" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      </>;

    case 'side':
      return <>
        <circle cx="19" cy="23" r="3" fill="#3A2E2E"/>
        <circle cx="33" cy="23" r="3" fill="#3A2E2E"/>
        <circle cx="20.2" cy="21.8" r="1" fill="#fff"/>
        <circle cx="34.2" cy="21.8" r="1" fill="#fff"/>
      </>;

    case 'big':
      return <>
        <circle cx="18" cy="23.5" r="4.5" fill="#3A2E2E"/>
        <circle cx="30" cy="23.5" r="4.5" fill="#3A2E2E"/>
        <circle cx="19.8" cy="21.8" r="1.5" fill="#fff"/>
        <circle cx="31.8" cy="21.8" r="1.5" fill="#fff"/>
      </>;

    case 'star':
      return <>
        <path d="M18 19l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#3A2E2E"/>
        <path d="M30 19l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#3A2E2E"/>
      </>;

    case 'round':
      return <>
        <circle cx="18" cy="23" r="3.6" fill="#3A2E2E"/>
        <circle cx="30" cy="23" r="3.6" fill="#3A2E2E"/>
        <circle cx="19.4" cy="21.6" r="1.2" fill="#fff"/>
        <circle cx="31.4" cy="21.6" r="1.2" fill="#fff"/>
      </>;

    case 'dot':
    default:
      return <>
        <circle cx="18" cy="23" r="2.9" fill="#3A2E2E"/>
        <circle cx="30" cy="23" r="2.9" fill="#3A2E2E"/>
        <circle cx="19.1" cy="21.9" r="0.95" fill="#fff"/>
        <circle cx="31.1" cy="21.9" r="0.95" fill="#fff"/>
      </>;
  }
}

function Mouth({ type }) {
  switch (type) {
    case 'o':      return <ellipse cx="24" cy="33" rx="2.3" ry="2.8" fill="#E78A8A"/>;
    case 'grin':   return <path d="M18.5 32 Q24 37 29.5 32" stroke="#3A2E2E" strokeWidth="1.8" fill="#FFD0D0" strokeLinecap="round"/>;
    case 'small':  return <path d="M22 32.5 Q24 34 26 32.5" stroke="#3A2E2E" strokeWidth="1.6" fill="none" strokeLinecap="round"/>;
    case 'smile':
    default:       return <path d="M20 32 Q24 35.5 28 32" stroke="#3A2E2E" strokeWidth="1.8" fill="none" strokeLinecap="round"/>;
  }
}

export default function CatIcon({ mood = 'wave', size = 40, className = '' }) {
  const m = MOODS[mood] || MOODS.wave;
  return (
    <span className={`cat-icon ${className}`} style={{ width: size, height: size, background: m.bg }}>
      <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">

        {/* ── 귀 (뾰족한 삼각형, 고양이) ── */}
        <polygon points="7,26 14,4 22,22" fill={SKIN}/>
        <polygon points="41,26 34,4 26,22" fill={SKIN}/>
        <polygon points="10.5,24 14,9 20,21" fill={m.ear}/>
        <polygon points="37.5,24 34,9 28,21" fill={m.ear}/>

        {/* ── 얼굴 ── */}
        <ellipse cx="24" cy="30" rx="16.5" ry="14.5" fill={SKIN}/>

        {/* ── 볼터치 ── */}
        <ellipse cx="12" cy="34" rx="5.5" ry="3.5" fill={m.cheek}/>
        <ellipse cx="36" cy="34" rx="5.5" ry="3.5" fill={m.cheek}/>

        {/* ── 눈 ── */}
        <Eyes type={m.eyes}/>

        {/* ── 코 (하트 모양) ── */}
        <path d="M24 32.5 C24 32.5 21.5 30 22.5 28.8 C23.2 28 24 29 24 29 C24 29 24.8 28 25.5 28.8 C26.5 30 24 32.5 24 32.5 Z" fill="#F88BA0"/>

        {/* ── 입 ── */}
        <line x1="24" y1="32.5" x2="24" y2="33.2" stroke="#D06080" strokeWidth="1.2" strokeLinecap="round"/>
        <Mouth type={m.mouth}/>

        {/* ── 수염 (3줄씩 양쪽) ── */}
        <g stroke="#C4A888" strokeWidth="1.1" strokeLinecap="round" opacity="0.75">
          <line x1="5"  y1="29" x2="18" y2="31.5"/>
          <line x1="4"  y1="33" x2="18" y2="33"/>
          <line x1="5"  y1="37" x2="18" y2="34.5"/>
          <line x1="43" y1="29" x2="30" y2="31.5"/>
          <line x1="44" y1="33" x2="30" y2="33"/>
          <line x1="43" y1="37" x2="30" y2="34.5"/>
        </g>

      </svg>
      {m.accent && <span className="cat-icon__accent">{m.accent}</span>}
    </span>
  );
}

export const PART_MOODS = {
  1: 'wave',       // 자기소개 — 인사
  2: 'look',       // 그림 보고 답하기 — 호기심
  3: 'wink',       // 대화 완성 — 윙크
  4: 'chill',      // 일상 화제 — 편안
  5: 'think',      // 의견 제시 — 생각
  6: 'surprise',   // 상황 대응 — 놀람
  7: 'star',       // 스토리 구성 — 반짝
};

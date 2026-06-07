// Google TTS — /api/tts 경유, 버튼 클릭(user gesture) 시에만 호출

const FEMALE_VOICE = 'ja-JP-Neural2-B';
const MALE_VOICE   = 'ja-JP-Neural2-C';

// 남성 화자 레이블 (네코짱 앱과 동일)
const MALE_SPEAKERS = new Set([
  'おとこのひと','おとこのこ','いしゃ','おっと','むすこ','ちち','おじさん','おにいさん','せんせい',
  '男','上司','店員','係員','男性',
]);
const FEMALE_SPEAKERS = new Set([
  'おんなのひと','おんなのこ','かんじゃ','おかあさん','むすめ','おばさん','おねえさん',
  '女','女性','スタッフ',
]);

async function fetchAudio(text, voice) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error('TTS API 실패');
  const { audioContent } = await res.json();
  if (!audioContent) throw new Error('오디오 없음');
  return audioContent;
}

async function decodeAndPlay(ctx, base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const buffer = await ctx.decodeAudioData(bytes.buffer);
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = resolve;
    src.start(0);
  });
}

// 화자 레이블형 파싱: "おとこのひと：..." → [{text, voice}]
function parseTaskLines(ttsText) {
  const pattern = /([ぁ-ん一-龥々ーa-zA-Z]+)[：:]\s*/g;
  const lines = [];
  const seenOrder = [];
  let currentVoice = FEMALE_VOICE;
  let lastEnd = 0;

  for (const match of ttsText.matchAll(pattern)) {
    const before = ttsText.substring(lastEnd, match.index).trim();
    if (before) lines.push({ text: before, voice: currentVoice });

    const label = match[1];
    if (MALE_SPEAKERS.has(label)) {
      currentVoice = MALE_VOICE;
    } else if (FEMALE_SPEAKERS.has(label)) {
      currentVoice = FEMALE_VOICE;
    } else {
      if (!seenOrder.includes(label)) seenOrder.push(label);
      currentVoice = seenOrder.indexOf(label) % 2 === 0 ? FEMALE_VOICE : MALE_VOICE;
    }
    lastEnd = match.index + match[0].length;
  }

  const tail = ttsText.substring(lastEnd).trim();
  if (tail) lines.push({ text: tail, voice: currentVoice });
  return lines;
}

// 교대형 파싱: 문장 끝(。？！)마다 여성/남성 교대
function parseConversationLines(ttsText) {
  const sentences = [];
  let buf = '';
  for (const ch of ttsText) {
    buf += ch;
    if ('。？！'.includes(ch)) {
      if (buf.trim()) sentences.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) sentences.push(buf.trim());

  return sentences.map((text, i) => ({
    text,
    voice: i % 2 === 0 ? FEMALE_VOICE : MALE_VOICE,
  }));
}

// 단일 음성 재생 (monologue / SJPT 문제)
export async function speakJapanese(text, voice = FEMALE_VOICE) {
  const audioContent = await fetchAudio(text, voice);
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  await decodeAndPlay(ctx, audioContent);
  ctx.close();
}

// 청해 대화 재생 (남/녀 자동 분리)
// subType이 conversation이면 교대형, 화자 레이블 있으면 레이블형 사용
export async function speakListening(ttsText, subType = '') {
  if (!ttsText) return;

  const hasLabel = /[：:]/.test(ttsText);
  const isConv   = subType.includes('conversation') || subType.includes('task');

  let lines;
  if (hasLabel) {
    lines = parseTaskLines(ttsText);
  } else if (isConv) {
    lines = parseConversationLines(ttsText);
  } else {
    // 단독 청해 — 여성 한 목소리
    await speakJapanese(ttsText, FEMALE_VOICE);
    return;
  }

  if (!lines.length) return;

  // 모든 오디오 병렬 다운로드 후 순서대로 재생
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const audioContents = await Promise.all(
    lines.map(l => fetchAudio(l.text, l.voice))
  );

  for (const b64 of audioContents) {
    await decodeAndPlay(ctx, b64);
  }
  ctx.close();
}

// Google TTS — /api/tts 경유 재생
// AudioContext는 사용자 제스처(클릭) 핸들러 안에서만 호출해야 iOS Safari에서 동작함

let ctx = null;

function getCtx() {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

export async function speakJapanese(text, voice = 'ja-JP-Neural2-B') {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'TTS 요청 실패');
  }

  const { audioContent } = await res.json();
  const binary = atob(audioContent);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioCtx = getCtx();
  // iOS Safari: resume은 제스처 핸들러 안에서 반드시 호출
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const buffer = await audioCtx.decodeAudioData(bytes.buffer);
  return new Promise((resolve) => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = resolve;
    source.start(0);
  });
}

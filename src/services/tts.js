// Google TTS — /api/tts 경유, 버튼 클릭(user gesture) 시에만 호출

export async function speakJapanese(text, voice = 'ja-JP-Neural2-B') {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) throw new Error('TTS API 실패');
  const { audioContent } = await res.json();
  if (!audioContent) throw new Error('오디오 없음');

  // 매번 새 AudioContext 생성 (user gesture 보장)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const binary = atob(audioContent);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const buffer = await ctx.decodeAudioData(bytes.buffer);
  return new Promise((resolve, reject) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => { ctx.close(); resolve(); };
    src.onerror  = reject;
    src.start(0);
  });
}

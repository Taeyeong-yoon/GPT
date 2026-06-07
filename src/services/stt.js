// Google STT — /api/stt 경유
export async function transcribe({ audioBase64, encoding, sampleRateHertz }) {
  const res = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, encoding, sampleRateHertz }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data?.error?.message || 'STT 요청 실패');
  return { transcript: data.transcript || '', confidence: data.confidence };
}

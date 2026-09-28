// OpenAI Whisper STT — /api/stt 경유
import { authFetch } from './authFetch';
export async function transcribe({ audioBase64, mimeType = 'audio/webm' }) {
  const res = await authFetch('/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, mimeType }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data?.error?.message || 'STT 요청 실패');
  return { transcript: data.transcript || '' };
}

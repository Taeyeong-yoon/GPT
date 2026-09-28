// SJPT 채점 — mini=true 이면 gpt-4o-mini 사용 (비용 절감)
import { authFetch } from './authFetch';
export async function requestFeedback({ parts, level, mini = false }) {
  const res = await authFetch('/api/gpt-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts, level, mini }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data?.error?.message || 'GPT 채점 실패');
  return data.feedback;
}

// GPT-4o 채점 — /api/gpt-feedback 경유
export async function requestFeedback({ parts, level }) {
  const res = await fetch('/api/gpt-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts, level }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data?.error?.message || 'GPT 채점 실패');
  return data.feedback;
}

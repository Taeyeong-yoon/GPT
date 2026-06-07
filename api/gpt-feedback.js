// POST /api/gpt-feedback  — GPT-4o SJPT 채점 (1회 호출, JSON 강제)
const SYSTEM_PROMPT = `당신은 일본어 SJPT(Spoken Japanese Proficiency Test) 공인 채점관입니다.

평가 기준 (각 0~25점, 합계 100점):
- grammar: 조사/활용/시제 오류 빈도 및 문장 구조 정확도
- vocabulary: 상황에 맞는 단어 선택 및 어휘 다양성
- fluency: 문장 완성도, 답변 길이, 내용의 충실도
- naturalness: 일본어다운 표현 방식, 경어(敬語) 적절성

STT 변환 특성상 일부 오인식이 있을 수 있으므로 과도하게 감점하지 마세요.
답변이 짧거나 비어있으면 해당 항목은 0~5점 범위로 처리하세요.

반드시 아래 JSON 스키마로만 응답하세요. 그 외 텍스트나 마크다운 금지.

{
  "overall_score": <0~100 정수>,
  "grade": <"Lv.1"~"Lv.9" 중 하나>,
  "scores": { "grammar": <0~25>, "vocabulary": <0~25>, "fluency": <0~25>, "naturalness": <0~25> },
  "part_feedback": [{ "part": <1~4>, "comment": <한국어 1~2문장> }],
  "improvements": [<개선점1>, <개선점2>, <개선점3>],
  "model_expressions": [{ "situation": <상황설명>, "natural_expression": <더 자연스러운 일본어 표현> }]
}`;

function buildUserMessage(parts, level) {
  const lines = [`응시 정보: 목표 레벨 - ${level || 'N3'}, 총 ${parts.length}문항\n`];
  for (const p of parts) {
    lines.push(`[Part ${p.partNum}]\nQ: ${p.question}\nA: ${p.answer?.trim() || '(무응답)'}\n`);
  }
  return lines.join('\n');
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

async function callGpt(messages, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });

  const { parts, level } = req.body || {};
  if (!Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 400, message: 'parts 배열이 필요합니다.' } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'OpenAI 키 미설정' } });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: buildUserMessage(parts, level) },
  ];

  let raw = '';
  try {
    raw = await callGpt(messages, apiKey);
    const feedback = JSON.parse(stripCodeFence(raw));
    return res.status(200).json({ ok: true, feedback });
  } catch {
    // 1회 재시도
    try {
      raw = await callGpt(messages, apiKey);
      const feedback = JSON.parse(stripCodeFence(raw));
      return res.status(200).json({ ok: true, feedback });
    } catch (e2) {
      return res.status(422).json({ ok: false, error: { code: 422, message: `피드백 파싱 실패: ${e2.message}` } });
    }
  }
}

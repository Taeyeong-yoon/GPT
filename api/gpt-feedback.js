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
  "part_feedback": [{ "part": <1~7>, "comment": <한국어 1~2문장> }],
  "improvements": [<개선점1>, <개선점2>, <개선점3>],
  "model_expressions": [{ "situation": <상황설명>, "natural_expression": <더 자연스러운 일본어 표현> }]
}`;

// Part 7 전용 — 4컷 만화 스토리 묘사 채점
function buildPart7SystemPrompt(theme, keywords) {
  const kw = keywords?.join('·') || '';
  return `당신은 일본어 SJPT 7부 전문 채점관입니다.
7부는 4컷 만화를 보고 등장인물의 행동과 감정을 포함한 스토리를 일본어로 설명하는 시험입니다.
이번 만화의 테마: ${theme || '일상 에피소드'}
핵심 키워드: ${kw || '없음'}

평가 기준 (각 0~25점, 합계 100점):
- grammar: 조사/활용/시제 오류 빈도 및 문장 구조 정확도
- vocabulary: 핵심 키워드(${kw}) 및 상황에 맞는 어휘 활용도 (동의어·유의어 표현도 인정)
- fluency: 4컷 스토리 전체 커버 여부, 각 장면의 행동·감정 묘사 충실도, 답변 길이
- naturalness: 일본어다운 이야기 연결 방식, 접속사·지시어 사용, 시제 일관성

STT 변환 오인식에 대해 과도하게 감점하지 마세요.
키워드를 직접 언급하지 않아도 내용상 포함됐으면 vocabulary 점수에 반영하세요.
4컷 중 언급되지 않은 장면이 있으면 fluency에서 감점하고 part_feedback comment에 명시하세요.
답변이 짧거나 비어있으면 각 항목 0~5점으로 처리하세요.

반드시 아래 JSON 스키마로만 응답하세요. 그 외 텍스트나 마크다운 금지.

{
  "overall_score": <0~100 정수>,
  "grade": <"Lv.1"~"Lv.9" 중 하나>,
  "scores": { "grammar": <0~25>, "vocabulary": <0~25>, "fluency": <0~25>, "naturalness": <0~25> },
  "part_feedback": [{ "part": 7, "comment": <한국어 2~3문장: 커버된 장면 수, 키워드 활용, 개선점 포함> }],
  "improvements": [<개선점1>, <개선점2>, <개선점3>],
  "model_expressions": [{ "situation": <상황설명>, "natural_expression": <더 자연스러운 일본어 표현> }]
}`;
}

function buildUserMessage(parts, level) {
  const lines = [`응시 정보: 목표 레벨 - ${level || 'N3'}, 총 ${parts.length}문항\n`];
  for (const p of parts) {
    if (p.partNum === 7) {
      lines.push(`[Part 7 — 4컷 만화 스토리 묘사]\n테마: ${p.theme || ''}\n핵심 키워드: ${(p.keywords || []).join(', ')}\nQ: ${p.question}\nA: ${p.answer?.trim() || '(무응답)'}\n`);
    } else {
      lines.push(`[Part ${p.partNum}]\nQ: ${p.question}\nA: ${p.answer?.trim() || '(무응답)'}\n`);
    }
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

  const part7 = parts.find(p => p.partNum === 7);
  const systemPrompt = part7
    ? buildPart7SystemPrompt(part7.theme, part7.keywords)
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemPrompt },
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

// action:'chat' — 네코짱 JLPT 앱용 OpenAI 채팅 프록시. (라우트: /api/app)
//
// 왜 필요한가:
//   앱이 OpenAI 를 직접 호출하려면 API 키가 APK 안에 상수로 박혀야 한다
//   (--dart-define 은 난독화가 아니라 컴파일 타임 인라인이다). 배포된 번들에서
//   키가 그대로 추출되므로, 키는 서버에만 두고 앱은 이 엔드포인트를 부른다.
//
// 보호:
//   1. Firebase ID Token 필수 (익명 로그인 포함) — 무인증 크레딧 소모 차단.
//   2. 모델 화이트리스트 — 임의의 비싼 모델 호출 차단.
//   3. 길이 상한 — 메시지 수·문자 수·출력 토큰 상한으로 폭주 비용 차단.
import { requireAuth } from './_auth.js';
import { enforceDailyLimit } from './_ratelimit.js';

// 앱이 실제로 쓰는 모델만 허용.
const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4o']);
const DEFAULT_MODEL = 'gpt-4o-mini';

const MAX_MESSAGES = 20;
const MAX_CHARS_TOTAL = 24000;
const MAX_OUTPUT_TOKENS = 800;

export async function handleChat(req, res) {
  const caller = await requireAuth(req, res);
  if (!caller) return;
  if (!(await enforceDailyLimit(caller, 'chat', res))) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: { code: 500, message: 'OpenAI 키 미설정' } });
  }

  const { messages, model, maxTokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 400, message: 'messages가 필요합니다.' } });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ ok: false, error: { code: 400, message: '대화가 너무 깁니다.' } });
  }

  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      return res.status(400).json({ ok: false, error: { code: 400, message: 'messages 형식이 올바르지 않습니다.' } });
    }
    if (!['system', 'user', 'assistant'].includes(m.role)) {
      return res.status(400).json({ ok: false, error: { code: 400, message: '허용되지 않은 role 입니다.' } });
    }
    totalChars += m.content.length;
  }
  if (totalChars > MAX_CHARS_TOTAL) {
    return res.status(400).json({ ok: false, error: { code: 400, message: '입력이 너무 깁니다.' } });
  }

  const chosenModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
  const cap = Number.isInteger(maxTokens) && maxTokens > 0
    ? Math.min(maxTokens, MAX_OUTPUT_TOKENS)
    : MAX_OUTPUT_TOKENS;

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chosenModel,
        max_completion_tokens: cap,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('[app-chat] OpenAI 오류:', upstream.status, detail.slice(0, 300));
      // 상류 상태코드를 그대로 전달해 앱이 429/5xx 를 구분할 수 있게 한다.
      return res.status(upstream.status === 429 ? 429 : 502).json({
        ok: false,
        error: { code: upstream.status, message: 'AI 응답을 가져오지 못했습니다.' },
      });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(502).json({ ok: false, error: { code: 502, message: 'AI 응답이 비어 있습니다.' } });
    }

    return res.status(200).json({ ok: true, content: content.trim() });
  } catch (e) {
    console.error('[app-chat] 예외:', e?.message);
    return res.status(502).json({ ok: false, error: { code: 502, message: 'AI 서버 연결에 실패했습니다.' } });
  }
}

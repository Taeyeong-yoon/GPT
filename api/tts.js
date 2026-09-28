// POST /api/tts  — Google TTS 프록시 (네코짱 앱과 동일한 전처리 적용)
import { requireAuth } from './_auth.js';
import { enforceDailyLimit } from './_ratelimit.js';
import crypto from 'crypto';

// 인스턴스 수명 내 메모리 캐시
const cache = new Map();

// 한 번에 합성할 수 있는 최대 길이(구글 제한 5000바이트보다 보수적으로)
const MAX_TEXT_CHARS = 1500;

/**
 * 네코짱 앱과 동일한 TTS 전처리:
 * - 조사 は → わ  (문장 끝/공백 앞)
 * - 조사 へ → え  (문장 끝/공백 앞)
 * 이렇게 해야 일본어 TTS가 조사를 올바른 발음으로 띄어 읽음
 */
// 구글 TTS 허용 범위 밖의 값이 오면 기본값으로 되돌린다.
function clamp(value, min, max, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function preprocessForTts(text) {
  return text
    .replace(/は(?=[ 　。、？！\n]|$)/g, 'わ')
    .replace(/へ(?=[ 　。、？！\n]|$)/g, 'え');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });
  // 유료 API 보호: 인증된 사용자만 호출 가능(무인증 크레딧 소모 차단).
  const caller = await requireAuth(req, res);
  if (!caller) return;
  if (!(await enforceDailyLimit(caller, 'tts', res))) return;

  const {
    text,
    voice = 'ja-JP-Neural2-B',
    languageCode = 'ja-JP',
    speakingRate,
    pitch,
  } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ ok: false, error: { code: 400, message: 'text 필드가 필요합니다.' } });
  if (text.length > MAX_TEXT_CHARS) {
    return res.status(400).json({ ok: false, error: { code: 400, message: '텍스트가 너무 깁니다.' } });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'TTS 키 미설정' } });

  // speakingRate 기본 0.95: 자연스러운 띄어읽기 (1.0보다 약간 천천히)
  const rate = clamp(speakingRate, 0.25, 4.0, 0.95);
  const tone = clamp(pitch, -20.0, 20.0, 0.0);

  // 전처리 적용
  const processedText = preprocessForTts(text.trim());

  // 캐시 확인 — 음성 파라미터가 다르면 다른 오디오이므로 모두 키에 포함한다.
  const cacheKey = crypto
    .createHash('sha1')
    .update(`${languageCode}|${voice}|${rate}|${tone}|${processedText}`)
    .digest('hex');
  if (cache.has(cacheKey)) {
    return res.status(200).json({ ok: true, audioContent: cache.get(cacheKey) });
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: processedText },
          voice: { languageCode, name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: rate, pitch: tone },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ ok: false, error: { code: 502, message: `TTS 실패: ${err}` } });
    }

    const data = await response.json();
    const audioContent = data.audioContent;
    cache.set(cacheKey, audioContent);

    return res.status(200).json({ ok: true, audioContent });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { code: 502, message: e.message } });
  }
}

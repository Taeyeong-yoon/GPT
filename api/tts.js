// POST /api/tts  — Google TTS 프록시 (네코짱 앱과 동일한 전처리 적용)
import crypto from 'crypto';

// 인스턴스 수명 내 메모리 캐시
const cache = new Map();

/**
 * 네코짱 앱과 동일한 TTS 전처리:
 * - 조사 は → わ  (문장 끝/공백 앞)
 * - 조사 へ → え  (문장 끝/공백 앞)
 * 이렇게 해야 일본어 TTS가 조사를 올바른 발음으로 띄어 읽음
 */
function preprocessForTts(text) {
  return text
    .replace(/は(?=[ 　。、？！\n]|$)/g, 'わ')
    .replace(/へ(?=[ 　。、？！\n]|$)/g, 'え');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });

  const { text, voice = 'ja-JP-Neural2-B' } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ ok: false, error: { code: 400, message: 'text 필드가 필요합니다.' } });

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'TTS 키 미설정' } });

  // 전처리 적용
  const processedText = preprocessForTts(text.trim());

  // 캐시 확인
  const cacheKey = crypto.createHash('sha1').update(`${voice}|${processedText}`).digest('hex');
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
          voice: { languageCode: 'ja-JP', name: voice },
          // speakingRate 0.95: 자연스러운 띄어읽기 (1.0보다 약간 천천히)
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0.0 },
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

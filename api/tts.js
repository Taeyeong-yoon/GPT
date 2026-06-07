// POST /api/tts  — Google TTS 프록시 (키는 서버에서만)
import crypto from 'crypto';

// 인스턴스 수명 내 메모리 캐시
const cache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });

  const { text, voice = 'ja-JP-Neural2-B' } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ ok: false, error: { code: 400, message: 'text 필드가 필요합니다.' } });

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'TTS 키 미설정' } });

  // 캐시 확인
  const cacheKey = crypto.createHash('sha1').update(`${voice}|${text}`).digest('hex');
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
          input: { text },
          voice: { languageCode: 'ja-JP', name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 },
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

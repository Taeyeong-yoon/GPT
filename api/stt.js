// POST /api/stt  — Google Speech-to-Text 프록시
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });

  const {
    audio,
    languageCode   = 'ja-JP',
    encoding       = 'WEBM_OPUS',
    sampleRateHertz = 48000,
  } = req.body || {};

  if (!audio) return res.status(400).json({ ok: false, error: { code: 400, message: 'audio(base64) 필드가 필요합니다.' } });

  // 파일 크기 제한 (~10MB base64)
  if (audio.length > 13_000_000) return res.status(413).json({ ok: false, error: { code: 413, message: '오디오 파일이 너무 큽니다.' } });

  const apiKey = process.env.GOOGLE_STT_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'STT 키 미설정' } });

  try {
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { encoding, sampleRateHertz, languageCode, enableAutomaticPunctuation: true },
          audio:  { content: audio },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ ok: false, error: { code: 502, message: `STT 실패: ${err}` } });
    }

    const data = await response.json();
    const transcript = data.results
      ?.map(r => r.alternatives?.[0]?.transcript || '')
      .join('') || '';
    const confidence = data.results?.[0]?.alternatives?.[0]?.confidence ?? null;

    return res.status(200).json({ ok: true, transcript, confidence });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { code: 502, message: e.message } });
  }
}

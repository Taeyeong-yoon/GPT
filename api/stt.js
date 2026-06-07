// POST /api/stt — OpenAI Whisper STT (직접 fetch 방식)
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: { message: 'Method not allowed' } });

  const { audio, mimeType = 'audio/webm' } = req.body || {};
  if (!audio)
    return res.status(400).json({ ok: false, error: { message: 'audio 필요' } });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ ok: false, error: { message: 'OpenAI 키 미설정' } });

  try {
    const buffer = Buffer.from(audio, 'base64');
    const ext    = mimeType.includes('mp4') ? 'mp4'
                 : mimeType.includes('ogg') ? 'ogg'
                 : 'webm';

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body:    formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ ok: false, error: { message: `Whisper 오류: ${err}` } });
    }

    const data = await response.json();
    return res.status(200).json({ ok: true, transcript: data.text || '' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

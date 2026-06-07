// POST /api/stt — OpenAI Whisper STT (일본어)
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: { message: 'Method not allowed' } });

  const { audio, mimeType = 'audio/webm' } = req.body || {};
  if (!audio)
    return res.status(400).json({ ok: false, error: { message: 'audio(base64) 필드가 필요합니다.' } });
  if (audio.length > 13_000_000)
    return res.status(413).json({ ok: false, error: { message: '파일이 너무 큽니다.' } });

  try {
    const buffer = Buffer.from(audio, 'base64');
    const ext    = mimeType.includes('mp4') ? 'mp4'
                 : mimeType.includes('ogg') ? 'ogg'
                 : 'webm';

    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });

    const result = await openai.audio.transcriptions.create({
      file,
      model:    'whisper-1',
      language: 'ja',
    });

    return res.status(200).json({ ok: true, transcript: result.text || '' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

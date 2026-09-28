// POST /api/stt — OpenAI Whisper STT (직접 fetch 방식)
import { requireAuth } from './_auth.js';
import { enforceDailyLimit } from './_ratelimit.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: { message: 'Method not allowed' } });
  // 유료 API 보호: 인증된 사용자만 호출 가능(무인증 크레딧 소모 차단).
  const caller = await requireAuth(req, res);
  if (!caller) return;
  if (!(await enforceDailyLimit(caller, 'stt', res))) return;


  // verbose:true → 이누짱 앱용. 세그먼트별 no_speech_prob 등을 그대로 돌려줘 앱이 환각을 걸러낸다.
  const { audio, mimeType = 'audio/webm', verbose = false } = req.body || {};
  if (!audio)
    return res.status(400).json({ ok: false, error: { message: 'audio 필요' } });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ ok: false, error: { message: 'OpenAI 키 미설정' } });

  try {
    const buffer = Buffer.from(audio, 'base64');
    const ext    = mimeType.includes('m4a') ? 'm4a'
                 : mimeType.includes('mp4') ? 'mp4'
                 : mimeType.includes('ogg') ? 'ogg'
                 : 'webm';

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');
    if (verbose) {
      formData.append('temperature', '0');                 // 없는 말 지어내기 억제
      formData.append('response_format', 'verbose_json');
    }

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
    return res.status(200).json({
      ok: true,
      transcript: data.text || '',
      ...(verbose ? { segments: data.segments || [] } : {}),
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

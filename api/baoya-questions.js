// GET /api/baoya-questions — 바오야(TSC) 6부 문제를 구글 시트(바오야_1부~6부)에서 읽어 제공.
// 응답: { ok, parts: [{ part, questions: [{ id, text, imageUrl }] }] }
// 클라이언트(question_service)가 파트별로 셔플·티어수만큼 추출하므로 여기선 풀 전체를 내려준다.
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID    = process.env.GOOGLE_SHEETS_ID || '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';

// 파트 순서대로 시트 탭 이름
const TABS = ['바오야_1부', '바오야_2부', '바오야_3부', '바오야_4부', '바오야_5부', '바오야_6부'];
const IMAGE_PARTS = new Set([2, 3, 6]); // 이미지 있는 파트

async function fetchSheet(range, apiKey) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets 오류: ${await res.text()}`);
  return (await res.json()).values || [];
}

// Drive 링크/파일ID → CORS 허용되는 lh3 CDN URL (외부 <img>·Flutter Image.network 로드 가능)
function imageUrl(cell) {
  const s = String(cell || '').trim();
  if (!s) return null;
  const m = s.match(/\/d\/([^/?]+)/) || s.match(/[?&]id=([^&]+)/);
  const id = m ? m[1] : (/^[\w-]{20,}$/.test(s) ? s : null);
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1000` : null;
}

function parseTab(rows, partNum, hasImage) {
  if (rows.length < 2) return [];
  const h = rows[0].map((c) => c?.toString().toLowerCase().trim() || '');
  const textIdx = h.findIndex((c) => c.includes('text') || c.includes('question'));
  const idIdx = h.indexOf('id');
  const imgIdx = hasImage ? h.findIndex((c) => c.includes('image')) : -1;
  if (textIdx < 0) return [];

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= textIdx) continue;
    const text = (row[textIdx] || '').toString().trim();
    if (!text) continue;
    const id = idIdx >= 0 && row.length > idIdx && row[idIdx]
      ? row[idIdx].toString()
      : `t${partNum}_${i}`;
    const img = imgIdx >= 0 && row.length > imgIdx ? row[imgIdx] : '';
    out.push({ id, part: partNum, text, imageUrl: hasImage ? imageUrl(img) : null });
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { message: 'Sheets 키 미설정' } });

  try {
    const results = await Promise.all(
      TABS.map((tab, i) => {
        const partNum = i + 1;
        const hasImage = IMAGE_PARTS.has(partNum);
        const range = hasImage ? `${tab}!A:D` : `${tab}!A:C`;
        return fetchSheet(range, apiKey).then((rows) => parseTab(rows, partNum, hasImage));
      }),
    );

    const parts = results
      .map((questions, i) => ({ part: i + 1, questions }))
      .filter((p) => p.questions.length > 0);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ ok: true, parts });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

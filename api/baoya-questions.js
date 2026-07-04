// GET /api/baoya-questions — 바오야(TSC) 7부 문제 제공 (SJPT와 동일 7파트 쌍둥이).
// 1부: 고정 4문항(자기소개). 2~7부: 구글 시트(바오야_2부~7부)에서 읽음.
// 응답: { ok, parts: [{ part, questions: [{ id, text, imageUrl, theme?, keywords? }] }] }
// 클라이언트(question_service)가 파트별로 셔플·티어수만큼 추출한다.
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID    = process.env.GOOGLE_SHEETS_ID || '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';

// 1부 고정 질문 4개 (SJPT 이름/주소/생일/취미의 중국어 쌍둥이)
const PART1_FIXED = [
  { id: 'baoya-1-name',     part: 1, text: '请问您叫什么名字？',      imageUrl: null },
  { id: 'baoya-1-address',  part: 1, text: '您住在哪里？',            imageUrl: null },
  { id: 'baoya-1-birthday', part: 1, text: '您的生日是什么时候？',    imageUrl: null },
  { id: 'baoya-1-hobby',    part: 1, text: '您有什么爱好？',          imageUrl: null },
];

// 2~7부 시트 탭 이름
const TABS = { 2: '바오야_2부', 3: '바오야_3부', 4: '바오야_4부', 5: '바오야_5부', 6: '바오야_6부', 7: '바오야_7부' };
const IMAGE_PARTS = new Set([2, 3, 6, 7]); // 이미지 있는 파트

async function fetchSheet(range, apiKey) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets 오류(${range}): ${await res.text()}`);
  return (await res.json()).values || [];
}

// Drive 링크/파일ID → CORS 허용 lh3 CDN URL
function imageUrl(cell) {
  const s = String(cell || '').trim();
  if (!s) return null;
  const m = s.match(/\/d\/([^/?]+)/) || s.match(/[?&]id=([^&]+)/);
  const id = m ? m[1] : (/^[\w-]{20,}$/.test(s) ? s : null);
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1000` : null;
}

function parseTab(rows, partNum) {
  if (rows.length < 2) return [];
  const h = rows[0].map((c) => c?.toString().toLowerCase().trim() || '');
  const textIdx = h.findIndex((c) => c.includes('text') || c.includes('question'));
  const idIdx = h.indexOf('id');
  const imgIdx = h.findIndex((c) => c.includes('image'));
  const themeIdx = h.findIndex((c) => c.includes('theme'));
  const kwIdx = h.findIndex((c) => c.includes('keyword'));
  if (textIdx < 0) return [];

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= textIdx) continue;
    const text = (row[textIdx] || '').toString().trim();
    if (!text) continue;
    const id = idIdx >= 0 && row[idIdx] ? row[idIdx].toString() : `t${partNum}_${i}`;
    const img = IMAGE_PARTS.has(partNum) && imgIdx >= 0 ? row[imgIdx] : '';
    const q = { id, part: partNum, text, imageUrl: imageUrl(img) };
    if (themeIdx >= 0 && row[themeIdx]) q.theme = row[themeIdx].toString().trim();
    if (kwIdx >= 0 && row[kwIdx]) {
      q.keywords = row[kwIdx].toString().split(/[,，、·]/).map((s) => s.trim()).filter(Boolean);
    }
    out.push(q);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { message: 'Sheets 키 미설정' } });

  try {
    const partNums = [2, 3, 4, 5, 6, 7];
    const results = await Promise.all(
      // 탭이 아직 없거나 비어도 전체가 실패하지 않도록 파트별로 개별 처리
      partNums.map((p) =>
        fetchSheet(`${TABS[p]}!A:E`, apiKey).then((rows) => parseTab(rows, p)).catch(() => [])),
    );

    const parts = [{ part: 1, questions: PART1_FIXED }];
    results.forEach((questions, i) => {
      if (questions.length > 0) parts.push({ part: partNums[i], questions });
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ ok: true, parts });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

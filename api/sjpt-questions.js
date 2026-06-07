// GET /api/sjpt-questions — SJPT 문제 로드 (Sheet2 + Sheet6)
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID    = process.env.GOOGLE_SHEETS_ID || '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';

async function fetchSheet(range, apiKey) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Sheets 오류 (${range}): ${await res.text()}`);
  return (await res.json()).values || [];
}

// "Part 1" → 1, "Part 2" → 2
function parsePart(cell) {
  if (!cell) return 0;
  const m = String(cell).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function rowsToQuestions(rows, hasImage = false) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h?.toLowerCase().trim());
  const langIdx  = headers.indexOf('language');
  const partIdx  = headers.indexOf('part');
  const textIdx  = headers.indexOf('question');
  const imgIdx   = hasImage ? headers.findIndex(h => h.includes('image')) : -1;
  const idxMap   = { langIdx, partIdx, textIdx, imgIdx };

  return rows.slice(1)
    .filter(row => {
      const lang = (row[langIdx] || '').toLowerCase();
      return lang === 'japanese' || lang === 'japan';
    })
    .map((row, i) => ({
      id:       `sjpt-${hasImage?'img':'txt'}-${i+1}`,
      part:     parsePart(row[partIdx]),
      text:     (row[textIdx] || '').trim(),
      imageRef: imgIdx >= 0 ? (row[imgIdx] || '') : null,
      imageUrl: null,  // 이미지는 별도 처리
    }))
    .filter(q => q.text && q.part >= 1 && q.part <= 4);
}

function pick(arr, n) {
  const s = [...arr].sort(() => Math.random() - 0.5);
  return s.slice(0, n);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { message: 'Sheets 키 미설정' } });

  try {
    const [sheet2Rows, sheet6Rows] = await Promise.all([
      fetchSheet('Sheet2!A:G', apiKey),
      fetchSheet('Sheet6!A:H', apiKey),
    ]);

    const sheet2Qs = rowsToQuestions(sheet2Rows, false);
    const sheet6Qs = rowsToQuestions(sheet6Rows, true);

    // 파트별 분류
    const byPart = { 1:[], 2:[], 3:[], 4:[] };
    for (const q of sheet2Qs) {
      if (byPart[q.part]) byPart[q.part].push(q);
    }
    // Sheet6은 이미지 문제 (Part 2 위주)
    for (const q of sheet6Qs) {
      if (byPart[q.part]) byPart[q.part].push(q);
    }

    const parts = [1,2,3,4].map(p => ({
      part:      p,
      questions: pick(byPart[p], 2),
    }));

    return res.status(200).json({ ok: true, parts });
  } catch(e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

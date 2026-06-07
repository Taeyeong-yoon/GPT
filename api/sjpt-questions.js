// GET /api/sjpt-questions  — SJPT Google Sheets 문제 로드 (키 서버 보호)
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID    = process.env.GOOGLE_SHEETS_ID || '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';

function extractDriveFileId(cell) {
  if (!cell) return null;
  // https://drive.google.com/file/d/ID/view  또는  ?id=ID
  const m = cell.match(/\/d\/([^/]+)/) || cell.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}

function toDriveUrl(fileId) {
  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : null;
}

async function fetchSheet(range, apiKey) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Sheets 오류 (${range}): ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

function rowsToQuestions(rows, hasImage = false) {
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h?.toLowerCase().trim());
  const partIdx  = headers.findIndex(h => h.includes('part'));
  const textIdx  = headers.findIndex(h => h.includes('question') || h.includes('text'));
  const imgIdx   = hasImage ? headers.findIndex(h => h.includes('image')) : -1;
  const idIdx    = headers.findIndex(h => h === 'id');

  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const text = row[textIdx] || '';
    if (!text.trim()) continue;

    const part    = parseInt(row[partIdx] || '0', 10) || 0;
    const imageCell = imgIdx >= 0 ? row[imgIdx] : null;
    const fileId  = extractDriveFileId(imageCell);
    questions.push({
      id:       row[idIdx] || `q-${i}`,
      part,
      text:     text.trim(),
      imageUrl: toDriveUrl(fileId),
    });
  }
  return questions;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: { code: 500, message: 'Sheets 키 미설정' } });

  try {
    // Sheet2: 일반 일본어 문제 (Part 1, 3, 4)
    // Sheet6: 이미지 포함 (Part 2)
    const [sheet2Rows, sheet6Rows] = await Promise.all([
      fetchSheet('Sheet2!A:G', apiKey),
      fetchSheet('Sheet6!A:H', apiKey),
    ]);

    // 헤더 로그 (디버그용)
    if (sheet2Rows[0]) console.log('[SJPT] Sheet2 headers:', sheet2Rows[0]);
    if (sheet6Rows[0]) console.log('[SJPT] Sheet6 headers:', sheet6Rows[0]);

    const sheet2Qs = rowsToQuestions(sheet2Rows, false);
    const sheet6Qs = rowsToQuestions(sheet6Rows, true);

    // Part별로 분류 (Part 2는 Sheet6 우선)
    const byPart = { 1: [], 2: [], 3: [], 4: [] };
    for (const q of sheet2Qs) {
      if (q.part >= 1 && q.part <= 4 && q.part !== 2) byPart[q.part].push(q);
    }
    for (const q of sheet6Qs) {
      if (q.part >= 1 && q.part <= 4) byPart[q.part].push(q);
    }
    // Part 2가 sheet6에 없으면 sheet2에서 보완
    if (byPart[2].length === 0) {
      for (const q of sheet2Qs) {
        if (q.part === 2) byPart[2].push(q);
      }
    }

    // 각 파트에서 2문항씩 랜덤 선택
    function pick2(arr) {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 2);
    }

    const parts = [1, 2, 3, 4].map(p => ({
      part:      p,
      questions: pick2(byPart[p]),
    }));

    return res.status(200).json({ ok: true, parts });
  } catch (e) {
    return res.status(502).json({ ok: false, error: { code: 502, message: e.message } });
  }
}

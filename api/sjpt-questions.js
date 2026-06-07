// GET /api/sjpt-questions — Sheet2(Part1~7) + Sheet6(Part2/3 이미지)
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID    = process.env.GOOGLE_SHEETS_ID || '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';

// Drive 이미지 파일명 → URL 변환
const FILE_ID_MAP = {
  "Part 2-1.png":"1hQ7OCpkYxoTl8oI-RxXDscNoozWExyTZ","Part 2-2.png":"1p4fIzeImDkqs_iGk-bEsg_4k6OPoBlhu","Part 2-3.png":"1bRLV23EF_OX4VdErSPIfGS_DmHmLIjgZ","Part 2-4.png":"1oBZGelleofMxvl3T79YmnrZs1ELhCYtj","Part 2-5.png":"1pB7a96arM7CfV9WzZ5DeZ3kceTvdB53p","Part 2-6.png":"1-xWdRNU2GvYo0iR4eQDRpPP-j4pNmmfx","Part 2-7.png":"11bW2-fQsAUDhqNl33V_x3NTFBelnJRP0","Part 2-8.png":"1KTxOmR7G6otdsCK6EFombNREggT-ttk6","Part 2-9.png":"1ngRKnJkpTzWox4j2aMrVweRLSxjP11Wh","Part 2-10.png":"1SbKlRsWI18_AlPlmIKP09fvvZpWhF1Ep","Part 2-11.png":"1odCx2h0LB0py2P-h5X1qgE3d56EjktCb","Part 2-12.png":"1nKq1ob8DzfOFz7Kn0y0-BQ7cfeUdAZd2","Part 2-13.png":"1qKyFn_gYRnduH7fUfQ3i-nsU94BtWznJ","Part 2-14.png":"1tQEyvr_VR4J8OQU8W-r6VJfTJ4WRRYnc","Part 2-15.png":"1Tgnz5sPB0z7Exr13ISJciCzbB3HuQfdM","Part 2-16.png":"1khJ6A6dv24e8Wf4wkmfGeFykLEycYkZQ","Part 2-17.png":"1VqYs2Vd4kGsoG0Kts0KoOC2RF43u_vac","Part 2-18.png":"1zUt8WPUW5OTWtIofD4lJUQoqCvxpayFe","Part 2-19.png":"1QpToxh2gUkpyH-s0OT-fX5CNkrOIxXnU","Part 2-20.png":"1xOGMylqHrJMlkCXYIEqxrqxmzSZs9bW3","Part 2-21.png":"1yDcZXJw694eNQmrNIYVtXOeTio9-eMhC","Part 2-22.png":"1dlzu41I9rlImABZYVtWNm_a7HB6vSqzy","Part 2-23.png":"1JpwBn00LUr1jpL2NW3YxjRy_hp258X2a","Part 2-24.png":"1ueTRQghmQICxyXk1gxO446haul7-2tXg","Part 2-25.png":"19gvxNCw_ectPHfUYJG0OTIuKDqKkSrSz","Part 2-26.png":"18U-XNZi4W8vG1I9JgwY2kXAvh78QA7Q_","Part 2-27.png":"1iIVO0RK7KQkgXCmXJfC7ihQyRYfmWVUP","Part 2-28.png":"1TO_hdF7I-GHEjLOwlWpyEq9Lmv830t6F","Part 2-29.png":"1hPlKHtw-JuBtFMOsxvE5SPmJI3T58c21","Part 2-30.png":"16T8f9lh60amDjDG1RHy2ZD3PPjPTpvjy","Part 2-31.png":"1doLV0YptKUhAWVcSW_cFFZJePE98XjMa","Part 2-32.png":"1f3W94VWIU_UGuUID0ZvXL0SZRkJmyqZw","Part 2-33.png":"1UFNP_6gxNpTbjlbSU-2Z1jr3zaz-ADNv","Part 2-34.png":"1Y9-D3Y1XvR9dVXDuMuTI9dNANW-o1Wvp","Part 2-35.png":"1ETTK2o3gScuUD8UWkc6czLPR4f4xnFQZ","Part 2-36.png":"1bpPrPHNVJ4iANq-FnfqONvxMM2cjQH3-","Part 2-37.png":"1Yoz6nsWLh2yBbjptw1LSjsvx4MrJYoGK","Part 2-38.png":"11WfZYI0g6I6vCGvJCS-ZXJRev4f2JmRS","Part 2-39.png":"11yTEBCoj4ER5538SVUz0elZkNkvQ77jF","Part 2-40.png":"1d78qoaKCckWX9YIOYLo2RJZRX2MHr_FX","Part 2-41.png":"1Jm7oi2JBAQxrCrHPPsk4NwOFtzQ4AM6g","Part 2-42.png":"1jttNddsbeSdfhNE7uJVcfBpHbQFz9Bjs",
  "Part 3-1.png":"1N4ZzsewrqTh7Ggd8lBF-0XgsxSrV7cmU","Part 3-2.png":"1_Ja9DqK10ActarM7TlRKAwhUSi1xzTql","Part 3-3.png":"1UyjtPGMGICrwlCBH82TSMaDn55FNfIAS","Part 3-4.png":"1GwjrOCHtocTgVY3Qcnlt5YiNEFh6IP3U","Part 3-5.png":"13J92lw37K02EFhPuV7frWRV8hNWBWzKJ","Part 3-6.png":"1VMtD1uOAiD_NHm9R9BkzrCpsN689W2Xe","Part 3-7.png":"1c8pXzIqIjVCedCSQnWG76jblZNHutHrO","Part 3-8.png":"149pVXRtTDZQAY8iYrHjCfqAH7wTaRD_c","Part 3-9.png":"1iuwhxmx9i3nkl0efgC04Y__w4w-4JcbQ","Part 3-10.png":"1fHXpBHuXpEQGN7GEg-loBmSfjpzt1KSO","Part 3-11.png":"1pHefQHRGg0PIOKjXhcs5ODCjvAbrR_fp","Part 3-12.png":"1cZsbnRJwldrxn07EE0ssxc7p9Cj-egNL","Part 3-13.png":"1Hbjwu_T14HK5uNjq---rJPuWsgDyrCUb","Part 3-14.png":"1_97TVyKTN39qnJUiwjwC_XGxY9WBw-5S","Part 3-15.png":"1tcRpR9wGDSFOdXyt35Z77dgi3KPaOefN","Part 3-16.png":"1MKkhx5cNQ9vLD1Wi6_uDp1izGehGRSKY","Part 3-17.png":"1N_7CRM3zT9M-riTfqW9E0yJOspPWMC8u","Part 3-18.png":"1nR_D1mVLw9YmeZhEBhujrBNSTG74UYg1","Part 3-19.png":"14WpKkNyxW9SI6FRBVB1iK7bVZn6iUgYI","Part 3-20.png":"17A8yvnMc2hNYIKWVQciheLBVr5HJRD9i","Part 3-21.png":"1P_UYcPgDeCPbaZMjpaWBU15ewRxQSyeF","Part 3-22.png":"1iVNWocG0lGSAVgL6aFHM2R5qq_I_3fsl","Part 3-23.png":"1ZhWEEw9fGy2g8cBTlYcZzJoztKSLQoHP","Part 3-24.png":"1XQ9zdIBd_UF_dfw6fLKBKV6q8y2DLUIG","Part 3-25.png":"1Qw3DGwTG8WZZ4UfU97sWSoNACVpWQI-f","Part 3-26.png":"1OhmvCQkFFaYmGDtF3gKKJzuOwf6mrtpX","Part 3-27.png":"12CenEFAq3qa2hlu55GubkzIG18bAmir5","Part 3-28.png":"1EPGNbpFg-pyoHzirDELpEbyGMYnZAuLV","Part 3-29.png":"1_6UdoC-Mb9Gfnr-mW6RsVYGmusUShs1P","Part 3-30.png":"1y5HxhjZi-xdget-sRo-EdrYE7DMJattt","Part 3-31.png":"1FKMTGYd_wlYgjyod3ojE55rYq3nSSYhX","Part 3-32.png":"1HtG5KbFytOEVIyizMgvCfUSeDSi77LCv","Part 3-33.png":"1nNveLi49WsZgXopXDJk186MlsrHFU2_c","Part 3-34.png":"1WC7oDEgShQb32IbRx3u3IPHtkrciT-47","Part 3-35.png":"1IbmMqqK0BFZG-XGVG3grn-OLoYtwiYTM",
};

function getImageUrl(imageNo) {
  if (!imageNo) return null;
  const id = FILE_ID_MAP[imageNo];
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : null;
}

function parsePart(cell) {
  const m = String(cell || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function fetchSheet(range, apiKey) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Sheets 오류: ${await res.text()}`);
  return (await res.json()).values || [];
}

function parseRows(rows, hasImage = false) {
  if (rows.length < 2) return [];
  const h       = rows[0].map(c => c?.toLowerCase().trim());
  const langIdx = h.indexOf('language');
  const partIdx = h.indexOf('part');
  const textIdx = h.indexOf('question');
  const imgIdx  = hasImage ? h.findIndex(c => c.includes('image')) : -1;

  return rows.slice(1)
    .filter(r => {
      const lang = (r[langIdx] || '').toLowerCase();
      return lang.includes('japan');
    })
    .map((r, i) => ({
      id:       `sjpt-${hasImage?'img':'txt'}-${i+1}`,
      part:     parsePart(r[partIdx]),
      text:     (r[textIdx] || '').trim(),
      imageUrl: hasImage ? getImageUrl(r[imgIdx]) : null,
    }))
    .filter(q => q.text && q.part >= 1);
}

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
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

    const sheet2Qs = parseRows(sheet2Rows, false);
    const sheet6Qs = parseRows(sheet6Rows, true);

    // 파트별 분류 (Sheet6 이미지 문제가 우선)
    const byPart = {};
    for (const q of sheet2Qs) {
      if (!byPart[q.part]) byPart[q.part] = [];
      // Sheet6에 없는 파트만 Sheet2에서
      byPart[q.part].push(q);
    }
    // Sheet6 이미지 문제 (Part 2, 3)
    const img2 = sheet6Qs.filter(q => q.part === 2);
    const img3 = sheet6Qs.filter(q => q.part === 3);
    if (img2.length) byPart[2] = img2;
    if (img3.length) byPart[3] = img3;

    // 실제 있는 파트 번호 정렬
    const partNums = Object.keys(byPart).map(Number).filter(n => n >= 1).sort((a,b) => a-b);

    const parts = partNums.map(p => ({
      part:      p,
      questions: pick(byPart[p], 2),
    })).filter(p => p.questions.length > 0);

    return res.status(200).json({ ok: true, parts });
  } catch(e) {
    return res.status(502).json({ ok: false, error: { message: e.message } });
  }
}

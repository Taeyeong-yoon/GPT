/**
 * update-part6.mjs
 * 6부 100문항 전체 처리:
 *   1. 6부.txt 파싱 (100문항)
 *   2. gpt-image-1 이미지 생성 → public/sjpt/part6/ 저장 (Vercel CDN 서빙)
 *   3. Sheet2 → 기존 6부 삭제 후 100문항 교체
 *   4. Sheet6 → 6부 이미지 행 추가
 *   5. api/sjpt-questions.js getImageUrl 업데이트 (Part 6 → 로컬 경로)
 *
 * 사용법:
 *   node scripts/sjpt-sheet-update/update-part6.mjs \
 *     C:\Users\User7\Desktop\JLPT\secrets\google_service_account.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createSign } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET_ID    = '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';
const DALLE_DELAY = 13000; // 13초 간격

// ── JWT 토큰 발급 ─────────────────────────────────────────────────

function b64u(s) {
  return Buffer.from(s).toString('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function getToken(sa, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const hdr = { alg:'RS256', typ:'JWT' };
  const pay = { iss:sa.client_email, scope:scopes.join(' '),
    aud:'https://oauth2.googleapis.com/token', iat:now, exp:now+3600 };
  const msg = `${b64u(JSON.stringify(hdr))}.${b64u(JSON.stringify(pay))}`;
  const sg = createSign('RSA-SHA256');
  sg.update(msg);
  const jwt = `${msg}.${b64u(sg.sign(sa.private_key))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:jwt }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`토큰 발급 실패: ${JSON.stringify(d)}`);
  return d.access_token;
}

// ── 문제 파싱 ─────────────────────────────────────────────────────

function parseQuestions(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const qs = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d+)\.\s+\*\*\[([^\]]+)\]\s+(.+?)\*\*\s*$/);
    if (!m) continue;
    let kor = '';
    for (let j = i+1; j < Math.min(i+4, lines.length); j++) {
      const km = lines[j].trim().match(/^\((.+)\)$/);
      if (km) { kor = km[1]; break; }
    }
    qs.push({ num:+m[1], tag:m[2].trim(), jpn:m[3].trim(), kor });
  }
  return qs;
}

// ── 프롬프트 ──────────────────────────────────────────────────────

const TAG_MAP = {
  '직장인':     'a Japanese office worker',
  '대학생':     'a Japanese college student',
  '대학생/알바': 'a Japanese college student working part-time',
  '알바':       'a Japanese part-time worker',
  '일상':       'a Japanese person',
};

function buildPrompt(tag, kor) {
  const who  = TAG_MAP[tag] || 'a Japanese person';
  const core = kor.replace(/뭐라고 말하.*/,'').replace(/何と言.*/,'').trim().slice(0, 110);
  return `Japanese anime illustration, soft pastel colors, clean simple art style, no text or writing anywhere in the image. ` +
    `Scene: ${who} — ${core}. Expressive friendly characters, warm lighting.`;
}

// ── OpenAI gpt-image-1 ────────────────────────────────────────────

async function generateImage(apiKey, prompt) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${apiKey}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model:'gpt-image-1', prompt, n:1, size:'1024x1024', quality:'medium' }),
  });
  const d = await r.json();
  if (!r.ok) {
    if (d.error?.code === 'rate_limit_exceeded') throw Object.assign(new Error('RATE_LIMIT'), {isRateLimit:true});
    throw new Error(`이미지 생성 오류: ${JSON.stringify(d.error)}`);
  }
  return Buffer.from(d.data[0].b64_json, 'base64');
}

// ── Google Sheets ─────────────────────────────────────────────────

async function sheetsReq(token, path, opts = {}) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`,
    {
      ...opts,
      headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json', ...(opts.headers||{}) },
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(`Sheets 오류: ${JSON.stringify(d)}`);
  return d;
}

// ── api/sjpt-questions.js 업데이트 ───────────────────────────────
// Part 6 이미지는 Vercel public 폴더에서 직접 서빙 → Drive ID 불필요
// getImageUrl에 Part 6 로컬 경로 처리 추가

function updateSjptJs() {
  const filePath = join(__dirname, '../../api/sjpt-questions.js');
  let src = readFileSync(filePath, 'utf8');

  // getImageUrl에 Part 6 로컬 경로 처리가 없으면 추가
  if (!src.includes('part6-')) {
    src = src.replace(
      `function getImageUrl(imageNo) {
  const id = FILE_ID_MAP[imageNo];
  // drive.google.com/uc?export=view는 Cross-Origin-Resource-Policy: same-site를 반환해
  // 외부 도메인의 <img>에서 차단됨 → CORS 허용되는 lh3 CDN 사용 (크기도 축소되어 더 빠름)
  return id ? \`https://lh3.googleusercontent.com/d/\${id}=w1000\` : null;
}`,
      `function getImageUrl(imageNo) {
  // Part 6 이미지는 Vercel public 폴더에서 서빙 (Drive 불필요)
  if (/^part6-\\d+\\.png$/i.test(imageNo)) return \`/sjpt/part6/\${imageNo}\`;
  const id = FILE_ID_MAP[imageNo];
  // drive.google.com/uc?export=view는 Cross-Origin-Resource-Policy: same-site를 반환해
  // 외부 도메인의 <img>에서 차단됨 → CORS 허용되는 lh3 CDN 사용 (크기도 축소되어 더 빠름)
  return id ? \`https://lh3.googleusercontent.com/d/\${id}=w1000\` : null;
}`
    );
  }

  // Sheet6 파싱에 img6 추가 (없으면)
  if (!src.includes('img6')) {
    src = src.replace(
      /const img2 = sheet6Qs\.filter\(q => q\.part === 2\);\s*const img3 = sheet6Qs\.filter\(q => q\.part === 3\);\s*if \(img2\.length\) byPart\[2\] = img2;\s*if \(img3\.length\) byPart\[3\] = img3;/,
      `const img2 = sheet6Qs.filter(q => q.part === 2);
    const img3 = sheet6Qs.filter(q => q.part === 3);
    const img6 = sheet6Qs.filter(q => q.part === 6);
    if (img2.length) byPart[2] = img2;
    if (img3.length) byPart[3] = img3;
    if (img6.length) byPart[6] = img6;`
    );
    src = src.replace('// Sheet6 이미지 문제 (2~3부)', '// Sheet6 이미지 문제 (2~3부, 6부)');
  }

  writeFileSync(filePath, src);
}

// ── sleep ─────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── MAIN ──────────────────────────────────────────────────────────

async function main() {
  const saPath = process.argv[2];
  if (!saPath) {
    console.error('사용법: node update-part6.mjs <service-account.json>');
    process.exit(1);
  }

  const sa        = JSON.parse(readFileSync(saPath, 'utf8'));
  const apiKeys   = JSON.parse(readFileSync(join(__dirname, '../../api_keys.json'), 'utf8'));
  const openaiKey = apiKeys.openai.api_key;

  // 문제 파싱
  const questions = parseQuestions(join(__dirname, '../../6부.txt'));
  console.log(`✅ 파싱 완료: ${questions.length}개 문제`);
  if (questions.length !== 100) throw new Error(`100개여야 하는데 ${questions.length}개`);

  // 출력 폴더: public/sjpt/part6/
  const outDir = join(__dirname, '../../public/sjpt/part6');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  console.log(`📁 출력 폴더: ${outDir}`);

  // 체크포인트 (재시작 가능)
  const cpFile = join(__dirname, 'part6-progress.json');
  const progress = existsSync(cpFile)
    ? JSON.parse(readFileSync(cpFile, 'utf8'))
    : { generated: [] };
  const doneSet = new Set(progress.generated);

  // ── Phase 1: 이미지 생성 ──────────────────────────────────────
  const todo = questions.filter(q => !doneSet.has(q.num));
  console.log(`\n🎨 이미지 생성 시작: ${todo.length}개 (약 ${Math.ceil(todo.length * 13 / 60)}분 소요)`);

  for (let idx = 0; idx < todo.length; idx++) {
    const q = todo[idx];
    const filename = `part6-${q.num}.png`;
    const outPath  = join(outDir, filename);
    console.log(`  [${q.num}/100] ${q.tag}: ${q.jpn.slice(0, 40)}...`);

    let buf;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        buf = await generateImage(openaiKey, buildPrompt(q.tag, q.kor));
        break;
      } catch (e) {
        if (e.isRateLimit && attempt < 4) {
          console.log(`    ⏳ 레이트리밋 — 65초 대기...`);
          await sleep(65000);
        } else throw e;
      }
    }

    writeFileSync(outPath, buf);
    progress.generated.push(q.num);
    writeFileSync(cpFile, JSON.stringify(progress, null, 2));
    console.log(`    ✅ ${filename} 저장 (${(buf.length/1024).toFixed(0)}KB)`);

    if (idx < todo.length - 1) await sleep(DALLE_DELAY);
  }

  console.log('\n✅ 이미지 생성 완료!');

  // ── Phase 2: Sheets 토큰 발급 ────────────────────────────────
  console.log('\n🔑 Sheets 토큰 발급...');
  const sheetsToken = await getToken(sa, ['https://www.googleapis.com/auth/spreadsheets']);

  // ── Phase 3: Sheet2 업데이트 ──────────────────────────────────
  console.log('\n📊 Sheet2 업데이트 (기존 6부 삭제 → 100문항 교체)...');

  const s2 = await sheetsReq(sheetsToken, `/values/${encodeURIComponent('Sheet2!A:H')}`);
  const s2rows = s2.values || [];
  if (s2rows.length < 2) throw new Error('Sheet2가 비어있음');

  const hdr2  = s2rows[0];
  const pIdx2 = hdr2.findIndex(h => String(h).toLowerCase().trim() === 'part');
  const levels = [];
  for (let i=0;i<34;i++) levels.push('Beginner');
  for (let i=0;i<33;i++) levels.push('Intermediate');
  for (let i=0;i<33;i++) levels.push('Advanced');

  const kept2  = [hdr2, ...s2rows.slice(1).filter(r => String(r[pIdx2]||'').trim() !== 'Part 6')];
  const newP6  = questions.map((q, i) => ['Japanese','Basic',levels[i],'Part 6',q.jpn,'','no','']);
  const newS2  = [...kept2, ...newP6];

  await sheetsReq(sheetsToken,
    `/values/${encodeURIComponent(`Sheet2!A1:H${s2rows.length}`)}:clear`,
    { method:'POST', body:'{}' });
  await sheetsReq(sheetsToken,
    `/values/${encodeURIComponent('Sheet2!A1')}?valueInputOption=RAW`,
    { method:'PUT', body: JSON.stringify({ values: newS2 }) });
  console.log(`   Sheet2 완료 — ${newS2.length}행`);

  // ── Phase 4: Sheet6 업데이트 ──────────────────────────────────
  console.log('\n📊 Sheet6 업데이트 (6부 이미지 행 추가)...');

  const s6 = await sheetsReq(sheetsToken, `/values/${encodeURIComponent('Sheet6!A:H')}`);
  const s6rows = s6.values || [];

  const hdr6 = s6rows.length > 0
    ? s6rows[0]
    : ['Language','Course','Level','Part','Question','Audio','Image','Difficulty'];

  const langI = hdr6.findIndex(h => /language/i.test(h));
  const partI = hdr6.findIndex(h => /^part$/i.test(String(h).trim()));
  const textI = hdr6.findIndex(h => /question/i.test(h));
  const imgI  = hdr6.findIndex(h => /image/i.test(h));

  const kept6 = [hdr6, ...s6rows.slice(1).filter(r => {
    const p = String(r[partI < 0 ? 3 : partI] || '').trim();
    return p !== 'Part 6';
  })];

  const newP6S6 = questions.map(q => {
    const row = new Array(hdr6.length).fill('');
    if (langI >= 0) row[langI] = 'Japanese';
    if (partI >= 0) row[partI] = 'Part 6';
    if (textI >= 0) row[textI] = q.jpn;
    if (imgI  >= 0) row[imgI]  = `part6-${q.num}.png`;
    return row;
  });

  const newS6 = [...kept6, ...newP6S6];
  if (s6rows.length > 0) {
    await sheetsReq(sheetsToken,
      `/values/${encodeURIComponent(`Sheet6!A1:H${s6rows.length}`)}:clear`,
      { method:'POST', body:'{}' });
  }
  await sheetsReq(sheetsToken,
    `/values/${encodeURIComponent('Sheet6!A1')}?valueInputOption=RAW`,
    { method:'PUT', body: JSON.stringify({ values: newS6 }) });
  console.log(`   Sheet6 완료 — ${newS6.length}행`);

  // ── Phase 5: sjpt-questions.js 업데이트 ──────────────────────
  console.log('\n🔧 api/sjpt-questions.js 업데이트...');
  updateSjptJs();
  console.log('   getImageUrl Part 6 로컬 경로 + img6 필터 추가 완료');

  // 완료
  writeFileSync(cpFile, JSON.stringify({ ...progress, completed: true }, null, 2));

  console.log('\n🎉 모든 작업 완료!');
  console.log(`  이미지: public/sjpt/part6/ (100개 PNG, Vercel CDN 서빙)`);
  console.log(`  Sheet2: 6부 100문항 교체`);
  console.log(`  Sheet6: 6부 100문항 + 이미지 등록`);
  console.log(`  sjpt-questions.js: Part 6 로컬 경로 + img6 필터`);
  console.log('\n다음 단계: git add public/sjpt/part6/ → commit → vercel deploy');
}

main().catch(e => { console.error('\n❌ 오류:', e.message); process.exit(1); });

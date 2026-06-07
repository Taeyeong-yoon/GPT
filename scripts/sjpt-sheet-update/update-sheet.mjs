// SJPT Part4/Part5 질문을 Google Sheet(Sheet2)에 반영하는 스크립트
// 사용법: node scripts/sjpt-sheet-update/update-sheet.mjs <서비스계정JSON경로>
//
// 동작:
//   1. 서비스 계정으로 OAuth2 액세스 토큰 발급 (JWT 서명, 외부 패키지 불필요)
//   2. Sheet2 전체 값을 읽음
//   3. 기존 Part 4 / Part 5 행을 제거하고, part4/part5-questions.json의 100문항으로 교체
//   4. Sheet2 데이터 범위를 새 값으로 덮어씀 (clear → update)

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET_ID  = '1jtfUtckNAAJJGLCQpUhR-J539Tk0i_OPz-jCV-HT4yY';
const SHEET_TAB = 'Sheet2';
const SCOPE     = 'https://www.googleapis.com/auth/spreadsheets';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('사용법: node update-sheet.mjs <서비스계정JSON경로>');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(keyPath, 'utf8'));

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const claims  = {
    iss:   sa.client_email,
    scope: SCOPE,
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`토큰 발급 실패: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sheetsFetch(token, path, opts = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets API 오류 (${path}): ${JSON.stringify(data)}`);
  return data;
}

function buildRows(questions, partLabel, level) {
  // course/level: Beginner/Intermediate/Advanced 균등 분배 (34/33/33)
  const sizes = { Beginner: 34, Intermediate: 33, Advanced: 33 };
  const levels = [];
  for (const [lvl, n] of Object.entries(sizes)) for (let i = 0; i < n; i++) levels.push(lvl);

  return questions.map((q, i) => ([
    'Japanese', 'Basic', levels[i], partLabel, q, '', 'no', '',
  ]));
}

async function main() {
  const q4 = JSON.parse(readFileSync(join(__dirname, 'part4-questions.json'), 'utf8'));
  const q5 = JSON.parse(readFileSync(join(__dirname, 'part5-questions.json'), 'utf8'));
  if (q4.length !== 100 || q5.length !== 100) {
    throw new Error(`질문 개수 불일치 (Part4: ${q4.length}, Part5: ${q5.length}, 각 100개여야 함)`);
  }

  console.log('OAuth2 토큰 발급 중...');
  const token = await getAccessToken();

  console.log(`${SHEET_TAB} 데이터 읽는 중...`);
  const read = await sheetsFetch(token, `/values/${encodeURIComponent(SHEET_TAB + '!A:H')}`);
  const rows = read.values || [];
  if (rows.length < 2) throw new Error('시트 데이터가 비어 있음');

  const header   = rows[0];
  const partIdx  = header.findIndex(h => String(h).toLowerCase().trim() === 'part');
  if (partIdx === -1) throw new Error('part 컬럼을 찾을 수 없음');

  const before = []; // Part 4 이전 (Part 1~3)
  const after  = []; // Part 5 이후 (Part 6, 7...)
  let seenP4 = false, seenP5 = false, pastP5 = false;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const part = String(r[partIdx] || '').trim();
    if (part === 'Part 4') { seenP4 = true; continue; }
    if (part === 'Part 5') { seenP5 = true; continue; }
    if (seenP5 && part !== 'Part 5') pastP5 = true;
    (pastP5 ? after : before).push(r);
  }

  console.log(`기존 Part4 발견: ${seenP4}, Part5 발견: ${seenP5}`);
  console.log(`유지되는 행 — Part1~3: ${before.length}개, Part6~: ${after.length}개`);

  const newPart4Rows = buildRows(q4, 'Part 4');
  const newPart5Rows = buildRows(q5, 'Part 5');

  const newValues = [
    header,
    ...before,
    ...newPart4Rows,
    ...newPart5Rows,
    ...after,
  ];

  console.log(`시트 비우는 중 (총 ${rows.length}행 범위)...`);
  await sheetsFetch(token, `/values/${encodeURIComponent(SHEET_TAB + '!A1:H' + rows.length)}:clear`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  console.log(`새 데이터 쓰는 중 (총 ${newValues.length}행)...`);
  await sheetsFetch(token, `/values/${encodeURIComponent(SHEET_TAB + '!A1')}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: newValues }),
  });

  console.log('완료! Part4/Part5 각 100문항으로 교체되었습니다.');
}

main().catch(e => { console.error(e); process.exit(1); });

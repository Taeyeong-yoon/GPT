/**
 * SJPT 7부 이미지 생성 스크립트
 * gpt-image-1 (high quality), 1024×1024, 2×2 4컷 만화
 *
 * 실행: OPENAI_API_KEY=sk-... node scripts/sjpt-part7/generate-images.js
 * 재개: progress.json에 진행 상태 저장 → 중단 후 재실행 시 이어서 진행
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTIONS_PATH = path.join(__dirname, 'questions.json');
const PROGRESS_PATH  = path.join(__dirname, 'progress.json');
const OUTPUT_DIR     = path.join(__dirname, '../../public/sjpt/part7');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8')); }
  catch { return { completed: [], failed: [] }; }
}
function saveProgress(p) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8');
}

async function generateImage(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model:   'gpt-image-1',
      prompt,
      n:       1,
      size:    '1024x1024',
      quality: 'high',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const b64  = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('응답에 b64_json 없음');
  return b64;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf-8'));
  const progress  = loadProgress();

  const todo = questions.filter(q => !progress.completed.includes(q.id));

  console.log(`\n📋 총 ${questions.length}문항 | 완료 ${progress.completed.length}개 | 남은 ${todo.length}개\n`);

  for (let i = 0; i < todo.length; i++) {
    const q = todo[i];
    const destPath = path.join(OUTPUT_DIR, q.imageFile);

    if (fs.existsSync(destPath)) {
      console.log(`⏭  ${q.id} — 파일 존재, 스킵`);
      if (!progress.completed.includes(q.id)) {
        progress.completed.push(q.id);
        saveProgress(progress);
      }
      continue;
    }

    try {
      console.log(`🎨 [${progress.completed.length + 1}/20] 생성 중: ${q.id} (${q.theme})`);

      const b64 = await generateImage(q.imagePrompt);
      fs.writeFileSync(destPath, Buffer.from(b64, 'base64'));
      console.log(`   ✅ 저장 완료: public/sjpt/part7/${q.imageFile}`);

      progress.completed.push(q.id);
      saveProgress(progress);

      // gpt-image-1 rate limit 대응: 호출 사이 5초 대기
      if (i < todo.length - 1) {
        console.log(`   ⏳ 5초 대기...`);
        await sleep(5000);
      }

    } catch (e) {
      console.error(`   ❌ 실패: ${q.id} — ${e.message}`);
      if (!progress.failed.includes(q.id)) progress.failed.push(q.id);
      saveProgress(progress);
      await sleep(5000);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ 완료: ${progress.completed.length}개`);
  if (progress.failed.length > 0) {
    console.log(`❌ 실패: ${progress.failed.length}개 → ${progress.failed.join(', ')}`);
    console.log('   재실행하면 실패 항목만 다시 시도합니다.');
  } else {
    console.log('🎉 모든 이미지 생성 완료!');
  }
  console.log(`📁 저장 위치: public/sjpt/part7/\n`);
}

main().catch(e => { console.error(e); process.exit(1); });

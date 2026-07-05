/**
 * SJPT 3부(대화 완성) 신규 30문항 이미지 생성 (part3-51 ~ part3-80)
 *
 * 스타일: 선명한 웹툰 화풍(산책 참고 이미지 수준), 2인 이상 대화 장면,
 *   핵심 소재를 그림/말풍선으로 명확히(학습자 이해 보조).
 * 규칙: 일본어 가나(히라가나·가타카나) 금지. 필요시 한자(漢字)만 OK. 되도록 글자 없음.
 *   (이미지가 일본어 SJPT + 중국어 TSC 앱 공용)
 *
 * 실행: OPENAI_API_KEY=... node scripts/sjpt-part3/gen-part3.mjs
 * 재개: 이미 있는 파일은 스킵.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../../public/sjpt/part3');
const KEY = process.env.OPENAI_API_KEY || JSON.parse(fs.readFileSync(path.join(__dirname, '../../api_keys.json'), 'utf8')).openai.api_key;
const DELAY = 6000;

const STYLE =
  'Vivid colorful Japanese anime / webtoon illustration, bright highly saturated colors, crisp clean bold ' +
  'outlines, richly detailed, high quality. TEXT RULE (very important): do NOT draw any Japanese hiragana ' +
  'or katakana anywhere; any writing may ONLY be Chinese characters (kanji), and preferably use NO text at ' +
  'all — NEVER kana, NEVER English words. It is a two-person conversation scene: BOTH people must be clearly ' +
  'and fully visible in a natural friendly conversation. Show the key item clearly (often via a round ' +
  'PICTURE speech-bubble with only a drawing inside, no text) so a language learner instantly understands ' +
  'the situation. Sunny warm inviting mood, clean and vibrant.\n\nScene: ';

// n: 번호, jp: 대사(시트 등록용), s: 장면+핵심소재 묘사
const SPECS = [
  { n:51, jp:'駅前に美味しいパン屋ができたんですが、今日の帰りに行ってみませんか。',
    s:'two young coworkers standing on a street in front of a train station in the evening; one warmly invites the other to a new bakery, gesturing toward it. A round picture speech-bubble above shows delicious bread and pastries (picture only). A cozy bakery storefront with a bread display is visible.' },
  { n:52, jp:'今週末、みんなでバーベキューをする予定ですが、一緒にどうですか。',
    s:'two friends talking in a sunny park; one cheerfully invites the other to a weekend barbecue. A round picture speech-bubble shows a barbecue grill with grilling meat and skewers (picture only). A grill and green trees are in the background.' },
  { n:53, jp:'明日のランチ、新しくできたラーメン屋に行こうと思うんですが、一緒に行きませんか。',
    s:'two coworkers in front of a cozy ramen shop; one invites the other to lunch. A round picture speech-bubble shows a steaming bowl of ramen with chopsticks (picture only). A bowl of ramen is also on display.' },
  { n:54, jp:'最近運動不足なので、今度の休みに一緒に山登りに行きませんか。',
    s:'two friends talking outdoors; one suggests going hiking on the next day off. A round picture speech-bubble shows a green mountain with a trail (picture only). Hills and blue sky in the background.' },
  { n:55, jp:'今日の仕事が終わったら、軽く一杯飲みに行きませんか。',
    s:'two coworkers on an evening street with a cozy izakaya; one invites the other for a drink after work. A round picture speech-bubble shows two frothy beer mugs clinking (picture only). Warm lantern-lit izakaya storefront (lanterns blank or a single kanji).' },
  { n:56, jp:'チケットが2枚あるんですが、今晩のコンサート、一緒に見に行きませんか。',
    s:'two friends talking; one happily holds up two concert tickets and invites the other. A round picture speech-bubble shows a bright concert stage with stage lights and music notes (picture only).' },
  { n:57, jp:'すみません、携帯のバッテリーが切れてしまったんですが、電話を1回貸してもらえませんか。',
    s:'two people on a street; a troubled person holds up their own dead smartphone (dark empty screen) and politely asks to borrow the other person\'s phone. A round picture speech-bubble shows a smartphone (picture only).' },
  { n:58, jp:'申し訳ありません。急に会議が入ってしまったので、今日の約束を1時間遅らせてもらえませんか。',
    s:'two coworkers talking; one apologetically asks to push their appointment later because a meeting came up. A round picture speech-bubble shows a wall clock with an arrow moving the time later (picture only, no numbers on the clock).' },
  { n:59, jp:'すみません、この書類のコピーを5枚お願いできますか。',
    s:'an office; one worker hands a document to a colleague standing by a copy machine and asks for copies. A round picture speech-bubble shows a stack of copied papers coming out of a copier (picture only).' },
  { n:60, jp:'道に迷ってしまったんですが、ここから一番近い地下鉄の駅への行き方を教えてくれませんか。',
    s:'two people on a city street; a lost person holding a paper map asks a friendly local for directions, while the local points the way. A round picture speech-bubble shows a subway station entrance sign icon and a train (picture only).' },
  { n:61, jp:'すみません、千円札を細かいお金に両替してもらえませんか。',
    s:'two people at a shop counter; one holds up a paper bill and asks to exchange it for coins. A round picture speech-bubble shows a banknote turning into a pile of coins (picture only, the bill has no kana).' },
  { n:62, jp:'漢字が難しくて読めないんですが、この手紙を読んでもらえませんか。',
    s:'two people; one holds out a letter and asks the other to read it because the characters are hard. A round picture speech-bubble shows an open letter/paper with faint kanji-like marks (picture only, no readable kana).' },
  { n:63, jp:'ここは誰も座っていませんか。私が座ってもいいですか。',
    s:'a cafe or waiting area; one person politely asks another, gesturing at an empty chair, whether the seat is free. A round picture speech-bubble shows an empty chair (picture only). The empty seat is clearly visible.' },
  { n:64, jp:'荷物が重そうですね。私がお手伝いしましょうか。',
    s:'a street or station; one kind person offers to help another who is struggling with heavy bags. A round picture speech-bubble shows heavy shopping bags / a suitcase (picture only). The heavy luggage is clearly visible.' },
  { n:65, jp:'部屋が少し寒いんですが、窓を閉めてもいいですか。',
    s:'indoors; one person, shivering and rubbing their arms from cold, politely asks another if they may close an open window. A round picture speech-bubble shows an open window with a cold breeze and snowflakes (picture only). The open window is clearly visible.' },
  { n:66, jp:'すみません、会議室を使いたいんですが、今入ってもいいですか。',
    s:'an office; one person at a meeting-room glass door politely asks a colleague if they may enter and use the room now. A round picture speech-bubble shows a meeting room with a table and chairs (picture only).' },
  { n:67, jp:'その本、とてもおもしろそうですね。読み終わったら、私に貸してくれませんか。',
    s:'two friends; one points with interest at a book the other is holding and asks to borrow it when finished. A round picture speech-bubble shows a book (picture only). The book is clearly visible in the other person\'s hands.' },
  { n:68, jp:'あ、ペンを落としましたよ。はい、どうぞ。',
    s:'a street or office; one kind person picks up a dropped pen and hands it back to the other with a smile. A round picture speech-bubble shows a pen (picture only). The pen being handed over is clearly visible.' },
  { n:69, jp:'すみません、この近くにATMはありませんか。',
    s:'two people on a city street; one asks the other whether there is an ATM nearby. A round picture speech-bubble shows an ATM cash machine (picture only).' },
  { n:70, jp:'お客さん、申し訳ありませんが、そのメニューは本日売り切れになってしまいました。',
    s:'a restaurant; an apologetic waiter tells a seated customer that the dish is sold out today. A round picture speech-bubble shows a plate of food with a red X over it (picture only, no text).' },
  { n:71, jp:'すみません、ソウル駅に行きたいんですが、どのバスに乗ればいいですか。',
    s:'two people at a bus stop; one asks the other which bus to take to the station. A round picture speech-bubble shows a city bus and a station building (picture only). A bus stop pole is visible.' },
  { n:72, jp:'お客さん、お支払いは現金ですか、それともクレジットカードですか。',
    s:'a shop checkout counter; a friendly clerk asks the customer whether they will pay by cash or card. A round picture speech-bubble shows paper cash next to a credit card (picture only).' },
  { n:73, jp:'袋はお入り用ですか。',
    s:'a convenience store checkout; a clerk asks the customer whether they need a bag. A round picture speech-bubble shows a shopping bag (picture only). Products on the counter are visible.' },
  { n:74, jp:'ごめん、電車が遅れて10分ぐらい遅刻しそう！',
    s:'a split-feel scene of two friends: on one side a person stands on a train platform looking flustered and apologetic holding a phone as a delayed train sits behind them; on the other side a friend waits at a cafe checking the time. A round picture speech-bubble shows a train with a clock (picture only, no numbers). Both people clearly visible.' },
  { n:75, jp:'よく見るテレビ番組はどんなジャンルですか。',
    s:'two friends chatting on a sofa; one asks the other what kind of TV programs they like. A round picture speech-bubble shows a television screen with simple picture icons of different genres (picture only).' },
  { n:76, jp:'休みの日は、たいてい何をして過ごしますか。',
    s:'two friends chatting; one asks how the other spends days off. A round picture speech-bubble shows relaxing leisure icons — a cozy sofa, a book and a cup of tea (picture only).' },
  { n:77, jp:'今まで勉強した外国語の中で、一番難しいと思ったのは何ですか。',
    s:'two people chatting; one asks which foreign language the other found hardest. A round picture speech-bubble shows a stack of language textbooks and a globe (picture only, no readable words).' },
  { n:78, jp:'毎朝、家を出る前に必ずすることは何ですか。',
    s:'two people chatting; one asks what the other always does every morning before leaving home. A round picture speech-bubble shows morning-routine icons — a toothbrush, a coffee cup and a rising sun (picture only).' },
  { n:79, jp:'犬と猫、ペットとして飼うならどちらが好きですか。',
    s:'two friends chatting; one asks whether the other prefers a dog or a cat as a pet. A round picture speech-bubble shows a cute dog and a cute cat side by side (picture only).' },
  { n:80, jp:'健康のために、普段気をつけていることはありますか。',
    s:'two people chatting; one asks what the other does to stay healthy. A round picture speech-bubble shows healthy items — fresh vegetables, a dumbbell and a glass of water (picture only).' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gen(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${KEY}` },
    body: JSON.stringify({ model:'gpt-image-1', prompt, n:1, size:'1024x1024', quality:'high' }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,200)}`);
  return Buffer.from((await res.json()).data[0].b64_json, 'base64');
}

const only = process.argv.slice(2).map(Number).filter(Boolean); // 특정 번호만 생성 옵션

async function main() {
  const todo = SPECS.filter(x => only.length ? only.includes(x.n) : true)
                    .filter(x => !fs.existsSync(path.join(OUT, `part3-${x.n}.png`)));
  console.log(`생성 대상 ${todo.length}개:`, todo.map(x=>x.n).join(', '));
  for (let i=0;i<todo.length;i++){
    const x = todo[i];
    try {
      const buf = await gen(STYLE + x.s);
      fs.writeFileSync(path.join(OUT, `part3-${x.n}.png`), buf);
      console.log(`✅ part3-${x.n}.png`);
    } catch(e){ console.error(`❌ part3-${x.n}: ${e.message}`); }
    if (i < todo.length-1) await sleep(DELAY);
  }
  console.log('완료');
}
main();

// POST /api/app — 앱·웹 공용 단일 엔드포인트 (action 으로 분기).
//
// 왜 하나로 합쳤나:
//   Vercel Hobby 플랜은 서버리스 함수가 프로젝트당 12개로 제한된다.
//   이미 배포된 이누짱/바오야 앱이 쓰는 엔드포인트는 경로를 바꿀 수 없으므로,
//   ai2 웹과 네코짱 앱만 쓰는 것들(chat / quota / sso)을 이 라우트로 모았다.
//   바오야가 /api/baoya-exam 에 결제 3종을 모아둔 것과 같은 패턴이다.
//
// action:
//   'chat'  → OpenAI 채팅 프록시   (앱 내장 키 제거용. 인증 필수)
//   'quota' → 응시 횟수 원장       (증가는 서버만. 인증 필수)
//   'sso'   → ID Token → Custom Token 교환 (웹 자동 로그인)
import { handleChat } from './_chat.js';
import { handleQuota } from './_quota.js';
import { handleSso } from './_sso.js';

const ROUTES = {
  chat: handleChat,
  quota: handleQuota,
  sso: handleSso,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 405, message: 'Method not allowed' } });
  }

  const action = req.body?.action;
  const route = ROUTES[action];
  if (!route) {
    return res.status(400).json({
      ok: false,
      error: { code: 400, message: '알 수 없는 action 입니다.' },
    });
  }

  return route(req, res);
}

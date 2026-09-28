// 유료 API 남용 방지 — 사용자(uid)당 하루 호출 상한.
//
// 이건 요금제(무료/프리미엄) 구분이 아니라 순수한 비용 사고 방지 장치다.
// 정상 사용자는 절대 닿지 않는 넉넉한 값을 쓰되, 계정 하나로 스크립트를 돌려
// OpenAI/Google 크레딧을 태우는 것만 막는다.
//
// 카운터는 JLPT 프로젝트(necojjangski) Firestore 에 둔다. 호출자가 다른
// 프로젝트(sjpt/baoya) 사용자여도 issuer 를 키에 포함해 충돌하지 않는다.
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './_admin.js';

export const DAILY_LIMITS = {
  tts: 400,        // 청해 한 문항이 여러 줄로 쪼개지므로 넉넉히
  chat: 80,        // 네코짱봇 + 2주 리포트
  stt: 200,        // SJPT 녹음 채점
  feedback: 60,    // GPT 채점
};

function dayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/// 호출 1회를 기록하고 한도 초과 여부를 돌려준다.
///
/// 실패(Firestore 장애 등) 시에는 통과시킨다 — 카운터 장애로 정상 사용자의
/// 학습을 막는 쪽이 더 나쁘다. 한도 자체가 안전망이지 인증 수단은 아니다.
export async function consumeApiQuota(caller, bucket) {
  const limit = DAILY_LIMITS[bucket];
  if (!limit) return { allowed: true };

  const docId = `${caller.issuer}_${caller.uid}_${dayKey()}`;
  const ref = db().collection('api_usage').doc(docId);

  try {
    const snap = await ref.get();
    const used = Number(snap.exists ? snap.data()?.[bucket] : 0) || 0;
    if (used >= limit) {
      return { allowed: false, used, limit };
    }
    await ref.set(
      {
        [bucket]: FieldValue.increment(1),
        issuer: caller.issuer,
        uid: caller.uid,
        updatedAt: new Date(),
        // Firestore TTL 정책을 expiresAt 에 걸어두면 자동 정리된다.
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      { merge: true },
    );
    return { allowed: true, used: used + 1, limit };
  } catch (e) {
    console.error('[ratelimit] 카운터 실패(통과):', e?.message);
    return { allowed: true };
  }
}

/// 핸들러에서 한 줄로 쓰는 가드. 초과 시 429 를 보내고 false 를 반환한다.
export async function enforceDailyLimit(caller, bucket, res) {
  const r = await consumeApiQuota(caller, bucket);
  if (r.allowed) return true;
  res.status(429).json({
    ok: false,
    error: { code: 429, message: '오늘 사용량 한도에 도달했어요. 내일 다시 이용해 주세요.' },
  });
  return false;
}

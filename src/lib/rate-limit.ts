import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { db } from "./firebase-admin";

// IP 해시 기준 요청 횟수 제한(고정 시간 창).
// rateLimits/{action}_{ipHash 앞 32자}_{창 시작 초} 문서에 count, expireAt을 저장한다.
// expireAt이 지난 문서는 Firestore TTL 정책(firestore.indexes.json)이 자동으로 지운다.
// TTL 삭제는 최대 24시간쯤 늦을 수 있으므로 코드에서도 expireAt을 확인한다.

export const RATE_LIMITS = "rateLimits";

export type RateLimitRule = { limit: number; windowSec: number };

/**
 * 동작별 제한. 한국 모바일망은 여러 사용자가 같은 공인 IP를 쓰는 경우가 많아
 * 사람 한 명 기준보다 넉넉하게 잡는다.
 */
export const RATE_LIMIT_RULES = {
  createCeremony: { limit: 20, windowSec: 10 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitAction = keyof typeof RATE_LIMIT_RULES;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimitKey(
  action: RateLimitAction,
  ipHash: string,
  windowStartMs: number,
): string {
  return `${action}_${ipHash.slice(0, 32)}_${Math.floor(windowStartMs / 1000)}`;
}

/** 한 번 쓴 것으로 센다. 한도를 넘으면 ok: false와 다시 시도까지 남은 초. */
export async function consumeRateLimit(
  action: RateLimitAction,
  ipHash: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const { limit, windowSec } = RATE_LIMIT_RULES[action];
  const nowMs = now.getTime();
  const windowMs = windowSec * 1000;
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((windowEnd - nowMs) / 1000));
  const ref = db
    .collection(RATE_LIMITS)
    .doc(rateLimitKey(action, ipHash, windowStart));

  return db.runTransaction(async (tx): Promise<RateLimitResult> => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : undefined;
    const expireAtMs =
      data?.expireAt instanceof Timestamp ? data.expireAt.toMillis() : 0;
    const used =
      data && expireAtMs > nowMs && typeof data.count === "number"
        ? data.count
        : 0;

    if (used >= limit) return { ok: false, retryAfterSec };

    tx.set(ref, { count: used + 1, expireAt: Timestamp.fromMillis(windowEnd) });
    return { ok: true, remaining: limit - used - 1 };
  });
}

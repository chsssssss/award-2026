import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "./firebase-admin";

// 요청 횟수 제한(고정 시간 창). rateLimits/{key}_{windowStart} 문서에 count와 expireAt을 둔다.
// expireAt이 지난 문서는 Firestore TTL 정책(firestore.indexes.json)이 자동으로 지운다.
// 창 번호가 문서 id에 들어가므로 TTL 삭제가 늦어도 지난 창의 문서를 다시 쓰지 않는다.

export const RATE_LIMITS = "rateLimits";

/** 창 번호: floor(현재 시각(초) / windowSec). */
export function windowStartOf(now: Date, windowSec: number): number {
  return Math.floor(now.getTime() / 1000 / windowSec);
}

export function rateLimitDocId(key: string, windowStart: number): string {
  return `${key}_${windowStart}`;
}

/** 지금 창이 끝날 때까지 남은 초(Retry-After 헤더용). */
export function retryAfterSec(now: Date, windowSec: number): number {
  const endMs = (windowStartOf(now, windowSec) + 1) * windowSec * 1000;
  return Math.max(1, Math.ceil((endMs - now.getTime()) / 1000));
}

/**
 * key(예: "trophy:" + ipHash)의 이번 창 횟수를 트랜잭션으로 1 올린다.
 * 한도 안이면 true, 이미 한도에 닿았으면 올리지 않고 false.
 * 처음 만들 때 expireAt = (windowStart + 2) × windowSec 시각.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
  now: Date = new Date(),
): Promise<boolean> {
  const windowStart = windowStartOf(now, windowSec);
  const ref = db.collection(RATE_LIMITS).doc(rateLimitDocId(key, windowStart));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        count: 1,
        expireAt: Timestamp.fromMillis((windowStart + 2) * windowSec * 1000),
      });
      return true;
    }
    const count = snap.data()?.count;
    if (typeof count === "number" && count >= limit) return false;
    tx.update(ref, { count: FieldValue.increment(1) });
    return true;
  });
}

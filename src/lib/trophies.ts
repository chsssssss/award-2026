import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ceremonyRef, toCeremony } from "./ceremonies";
import { db } from "./firebase-admin";
import { reserveRateLimit } from "./rate-limit";
import { createTrophySchema } from "./schemas";
import { isRevealed } from "./time";
import { trophyDocId } from "./voter";

export const TROPHIES = "trophies";

export type GiveTrophyResult =
  | { kind: "created" }
  | { kind: "not_found" }
  | { kind: "closed" }
  | { kind: "bad_request" }
  | { kind: "invalid"; field?: string; message: string }
  | { kind: "already_given" }
  | { kind: "rate_limited"; retryAfterSec: number };

export function trophyRef(slug: string, voterId: string) {
  return ceremonyRef(slug).collection(TROPHIES).doc(trophyDocId(voterId));
}

/**
 * 트로피 하나를 만든다. 한 트랜잭션 안에서 아래 순서로 판단한다.
 * 시상식 없음·숨김(not_found) → 공개 시각 지남(closed) → body 검증(bad_request/invalid)
 * → 이미 줌(already_given) → IP 요청 제한(rate_limited) → 생성 + trophyCount 1 증가.
 * 시각은 서버의 now로 판단한다.
 */
export async function giveTrophy(opts: {
  slug: string;
  voterId: string;
  ipHash: string;
  /** JSON 파싱 결과. 파싱에 실패했으면 { ok: false } */
  body: { ok: true; value: unknown } | { ok: false };
  now: Date;
}): Promise<GiveTrophyResult> {
  const { slug, voterId, ipHash, body, now } = opts;
  const cRef = ceremonyRef(slug);
  const tRef = trophyRef(slug, voterId);

  return db.runTransaction(async (tx): Promise<GiveTrophyResult> => {
    const ceremonySnap = await tx.get(cRef);
    const ceremonyData = ceremonySnap.exists ? ceremonySnap.data() : undefined;
    if (!ceremonyData) return { kind: "not_found" };
    const ceremony = toCeremony(slug, ceremonyData);
    if (ceremony.status === "hidden") return { kind: "not_found" };
    if (isRevealed(ceremony.revealAt, now)) return { kind: "closed" };

    if (!body.ok) return { kind: "bad_request" };
    const parsed = createTrophySchema.safeParse(body.value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? String(issue.path[0]) : undefined;
      return { kind: "invalid", field, message: issue?.message ?? "입력을 확인해주세요" };
    }

    const trophySnap = await tx.get(tRef);
    if (trophySnap.exists) return { kind: "already_given" };

    const limit = await reserveRateLimit(tx, "giveTrophy", ipHash, now);
    if (!limit.ok) return { kind: "rate_limited", retryAfterSec: limit.retryAfterSec };

    const data = parsed.data;
    tx.create(tRef, {
      awardId: data.awardId,
      customName: data.customName ?? null,
      reason: data.reason,
      senderName: data.anonymous ? null : (data.senderName ?? null),
      anonymous: data.anonymous,
      hidden: false,
      voterId,
      ipHash,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(cRef, { trophyCount: FieldValue.increment(1) });
    limit.commit();
    return { kind: "created" };
  });
}

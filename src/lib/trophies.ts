import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ceremonyRef, toCeremony } from "./ceremonies";
import { db } from "./firebase-admin";
import type { CreateTrophyData } from "./schemas";
import { isRevealed } from "./time";
import { trophyDocId } from "./voter";

export const TROPHIES = "trophies";

export type GiveTrophyResult =
  | { kind: "created" }
  | { kind: "not_found" }
  | { kind: "closed" }
  | { kind: "already_given" };

export function trophyRef(slug: string, voterId: string) {
  return ceremonyRef(slug).collection(TROPHIES).doc(trophyDocId(voterId));
}

/**
 * 검증을 마친 트로피 하나를 만든다(입력 검증·욕설·요청 제한은 라우트에서 먼저 한다).
 * 한 트랜잭션 안에서 시상식 없음·숨김(not_found) → 공개 시각 지남(closed)
 * → 이미 줌(already_given) → 생성 + trophyCount 1 증가 순으로 판단한다.
 * 라우트에서 확인한 뒤 그사이에 숨김·종료될 수 있어 트랜잭션에서 다시 확인한다.
 */
export async function giveTrophy(opts: {
  slug: string;
  voterId: string;
  ipHash: string;
  data: CreateTrophyData;
  now: Date;
}): Promise<GiveTrophyResult> {
  const { slug, voterId, ipHash, data, now } = opts;
  const cRef = ceremonyRef(slug);
  const tRef = trophyRef(slug, voterId);

  return db.runTransaction(async (tx): Promise<GiveTrophyResult> => {
    const ceremonySnap = await tx.get(cRef);
    const ceremonyData = ceremonySnap.exists ? ceremonySnap.data() : undefined;
    if (!ceremonyData) return { kind: "not_found" };
    const ceremony = toCeremony(slug, ceremonyData);
    if (ceremony.status === "hidden") return { kind: "not_found" };
    if (isRevealed(ceremony.revealAt, now)) return { kind: "closed" };

    const trophySnap = await tx.get(tRef);
    if (trophySnap.exists) return { kind: "already_given" };

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
    return { kind: "created" };
  });
}

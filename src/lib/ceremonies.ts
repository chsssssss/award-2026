import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { REVEAL_AT } from "./constants";
import { db } from "./firebase-admin";
import { isValidSlug } from "./slug";
import { isRevealed } from "./time";

export const CEREMONIES = "ceremonies";

export type CeremonyStatus = "active" | "hidden";

/** 서버 내부용 시상식 데이터. ownerTokenHash는 넣지 않는다. */
export type Ceremony = {
  slug: string;
  name: string;
  trophyCount: number;
  revealAt: Date;
  status: CeremonyStatus;
  createdAt: Date | null;
};

/** 화면·공개 API에 내보내도 되는 시상식 정보. */
export type PublicCeremony = {
  slug: string;
  name: string;
  revealAt: Date;
  trophyCount: number;
  /** 공개 시각이 지나 새 트로피를 받지 않는 상태 */
  closed: boolean;
};

export function ceremonyRef(slug: string) {
  return db.collection(CEREMONIES).doc(slug);
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

export function toCeremony(slug: string, data: DocumentData): Ceremony {
  return {
    slug,
    name: typeof data.name === "string" ? data.name : "",
    trophyCount: typeof data.trophyCount === "number" ? data.trophyCount : 0,
    revealAt: toDate(data.revealAt) ?? REVEAL_AT,
    status: data.status === "hidden" ? "hidden" : "active",
    createdAt: toDate(data.createdAt),
  };
}

/**
 * 관리 토큰 확인용으로 문서를 읽는다(token.ts의 verifyOwner 전용).
 * slug 형식이 틀리면 Firestore를 읽지 않는다.
 */
export async function getCeremonyWithHash(
  slug: string,
): Promise<{ ceremony: Ceremony; ownerTokenHash: string | null } | null> {
  if (!isValidSlug(slug)) return null;
  const snap = await ceremonyRef(slug).get();
  const data = snap.exists ? snap.data() : undefined;
  if (!data) return null;
  return {
    ceremony: toCeremony(slug, data),
    ownerTokenHash:
      typeof data.ownerTokenHash === "string" ? data.ownerTokenHash : null,
  };
}

/**
 * 공개 조회. 없거나 숨김(hidden)이면 null.
 * 반환값에 ownerTokenHash나 트로피 내용은 들어가지 않는다.
 */
export async function getPublicCeremony(
  slug: string,
  now: Date = new Date(),
): Promise<PublicCeremony | null> {
  const found = await getCeremonyWithHash(slug);
  if (!found || found.ceremony.status === "hidden") return null;
  const { name, revealAt, trophyCount } = found.ceremony;
  return {
    slug,
    name,
    revealAt,
    trophyCount,
    closed: isRevealed(revealAt, now),
  };
}

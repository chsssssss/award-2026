import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { customAlphabet } from "nanoid";

import { getCeremonyWithHash, type Ceremony } from "./ceremonies";
import { SLUG_ALPHABET, SLUG_LENGTH } from "./slug";

const nanoidSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

/** 시상식 주소용 8자 slug. 헷갈리는 0 o 1 l i는 쓰지 않는다. */
export function generateSlug(): string {
  return nanoidSlug();
}

/** 관리 토큰 원문(32자 base64url). 저장하지 않고 만들 때 응답으로 한 번만 내보낸다. */
export function generateOwnerToken(): string {
  return randomBytes(24).toString("base64url");
}

/** SHA-256 hex. Firestore에는 이 값만 저장한다. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** "Bearer <token>"에서 토큰을 꺼낸다. 형식이 틀리면 null. */
export function parseBearer(authorizationHeader: string | null | undefined) {
  const match = authorizationHeader?.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}

/**
 * 관리 토큰 확인. 맞으면 시상식 데이터(ownerTokenHash 제외), 아니면 null.
 * 비교는 timingSafeEqual로 한다.
 */
export async function verifyOwner(
  slug: string,
  authorizationHeader: string | null | undefined,
): Promise<Ceremony | null> {
  const token = parseBearer(authorizationHeader);
  if (!token) return null;

  const found = await getCeremonyWithHash(slug);
  if (!found?.ownerTokenHash) return null;

  const expected = Buffer.from(found.ownerTokenHash, "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  if (expected.length !== actual.length) return null;

  return timingSafeEqual(expected, actual) ? found.ceremony : null;
}

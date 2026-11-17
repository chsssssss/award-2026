import "server-only";

import { createHash } from "node:crypto";

import { nanoid } from "nanoid";

// 친구(투표자) 식별용 쿠키. 같은 친구는 한 시상식에 한 번만 상을 줄 수 있다.
// voterId 원문은 로그·분석 이벤트에 남기지 않는다(CLAUDE.md).

export const VOTER_COOKIE = "voterId";
const VOTER_ID_PATTERN = /^[A-Za-z0-9_-]{21}$/;
const ONE_YEAR_SEC = 365 * 24 * 60 * 60;

/** Cookie 헤더에서 voterId를 꺼낸다. 없거나 형식이 틀리면 null. */
export function readVoterId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== VOTER_COOKIE) continue;
    const value = part.slice(index + 1).trim();
    return VOTER_ID_PATTERN.test(value) ? value : null;
  }
  return null;
}

export function newVoterId(): string {
  return nanoid(21);
}

/** Set-Cookie 값. Secure는 프로덕션에서만(로컬 http 개발 서버에서도 쿠키가 동작하게). */
export function voterCookieHeader(voterId: string): string {
  const parts = [
    `${VOTER_COOKIE}=${voterId}`,
    "Path=/",
    `Max-Age=${ONE_YEAR_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** 트로피 문서 id = SHA-256(voterId) hex 앞 20자. */
export function trophyDocId(voterId: string): string {
  return createHash("sha256").update(voterId).digest("hex").slice(0, 20);
}

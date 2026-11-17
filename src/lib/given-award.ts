// 친구가 방금 준 상(이름·사유)을 이 탭의 sessionStorage에만 잠깐 보관한다.
// 완료 화면의 "내가 준 상" 카드에만 쓰고, 서버로 다시 보내지 않는다.

import { readSession, writeSession } from "./storage";

export type GivenAward = { awardName: string; reason: string };

export const givenAwardKey = (slug: string) => `given:${slug}`;

export function saveGivenAward(slug: string, award: GivenAward): boolean {
  return writeSession(givenAwardKey(slug), JSON.stringify(award));
}

/** 저장된 원문 문자열(없으면 null). useSyncExternalStore 스냅샷용으로 원시값을 돌려준다. */
export function readGivenAwardRaw(slug: string): string | null {
  return readSession(givenAwardKey(slug));
}

export function parseGivenAward(raw: string | null): GivenAward | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      typeof (value as GivenAward).awardName === "string" &&
      (value as GivenAward).awardName &&
      typeof (value as GivenAward).reason === "string"
    ) {
      const { awardName, reason } = value as GivenAward;
      return { awardName, reason };
    }
  } catch {
    // 깨진 값은 없는 것으로 본다
  }
  return null;
}

import { describe, expect, it } from "vitest";

import { AWARD_IDS, AWARDS, getAward, isAwardId } from "./awards";

describe("awards", () => {
  it("CLAUDE.md 순서대로 12개예요", () => {
    expect(AWARD_IDS).toEqual([
      "laugh",
      "mood",
      "counsel",
      "food",
      "godlife",
      "twist",
      "reply",
      "ghost",
      "late",
      "flex",
      "growth",
      "next",
    ]);
    expect(new Set(AWARD_IDS).size).toBe(AWARDS.length);
  });

  it("모든 상 이름은 '상'으로 끝나요", () => {
    for (const award of AWARDS) expect(award.name.endsWith("상")).toBe(true);
  });

  it("getAward는 id로 찾고, 모르는 id면 undefined", () => {
    expect(getAward("ghost")).toEqual({
      id: "ghost",
      name: "갑분잠수상",
      desc: "연락 두절의 아이콘",
    });
    expect(getAward("custom")).toBeUndefined();
    expect(isAwardId("late")).toBe(true);
    expect(isAwardId("toString")).toBe(false);
  });
});

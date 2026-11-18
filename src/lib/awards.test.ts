import { describe, expect, it } from "vitest";

import { AWARD_IDS, AWARDS, awardName, getAward, isAwardId } from "./awards";

describe("awards", () => {
  it("CLAUDE.md 순서대로 12개예요(인스타 스토리·게시물 테마)", () => {
    expect(AWARD_IDS).toEqual([
      "story",
      "closefriend",
      "storyreply",
      "birthday",
      "feedtone",
      "foodshot",
      "selfie",
      "travel",
      "caption",
      "likefairy",
      "reels",
      "lurker",
    ]);
    expect(new Set(AWARD_IDS).size).toBe(AWARDS.length);
  });

  it("모든 상 이름은 '상'으로 끝나요", () => {
    for (const award of AWARDS) expect(award.name.endsWith("상")).toBe(true);
  });

  it("getAward·isAwardId는 지금 상만", () => {
    expect(getAward("selfie")).toEqual({ id: "selfie", name: "셀카 각도 장인상", desc: "인생 각도를 앎" });
    expect(isAwardId("lurker")).toBe(true);
    expect(getAward("custom")).toBeUndefined();
    expect(isAwardId("toString")).toBe(false);
    // 예전 상은 새로 줄 수 없다
    expect(isAwardId("laugh")).toBe(false);
    expect(getAward("ghost")).toBeUndefined();
  });

  it("awardName은 예전 상 이름도 찾아요(이미 받은 트로피 표시용)", () => {
    expect(awardName("story")).toBe("스토리 장인상");
    expect(awardName("laugh")).toBe("웃음 지분 1위상");
    expect(awardName("twist")).toBe("반전 매력상");
    expect(awardName("next")).toBe("내년 기대주상");
    expect(awardName("custom")).toBeUndefined();
    expect(awardName("nope")).toBeUndefined();
  });

  it("예전 상과 지금 상의 id가 겹치지 않아요", () => {
    const legacy = ["laugh", "mood", "counsel", "food", "godlife", "twist", "reply", "ghost", "late", "flex", "growth", "next"];
    for (const id of legacy) expect(AWARD_IDS as readonly string[]).not.toContain(id);
  });
});

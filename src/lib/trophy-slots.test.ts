import { describe, expect, it } from "vitest";

import { MAX_VISIBLE_TROPHIES, trophySlots } from "./trophy-slots";

const kinds = (count: number) =>
  trophySlots(count).map((slot) => (slot.kind === "more" ? `+${slot.count}` : slot.kind));

describe("trophySlots", () => {
  it("0개면 빈칸 4개", () => {
    expect(kinds(0)).toEqual(["empty", "empty", "empty", "empty"]);
  });

  it("도착한 수만큼 잠긴 트로피 + 다음 빈칸 하나", () => {
    expect(kinds(1)).toEqual(["locked", "empty"]);
    expect(kinds(7)).toEqual([...Array(7).fill("locked"), "empty"]);
  });

  it("11개면 잠긴 트로피 11개 + 빈칸(12칸)", () => {
    expect(MAX_VISIBLE_TROPHIES).toBe(11);
    expect(kinds(11)).toEqual([...Array(11).fill("locked"), "empty"]);
  });

  it("넘치면 11개 + 마지막 칸 +N", () => {
    expect(kinds(12)).toEqual([...Array(11).fill("locked"), "+1"]);
    expect(kinds(40)).toEqual([...Array(11).fill("locked"), "+29"]);
    expect(trophySlots(1000)).toHaveLength(12);
  });

  it("이상한 값은 0개로", () => {
    expect(kinds(-3)).toEqual(kinds(0));
    expect(kinds(Number.NaN)).toEqual(kinds(0));
    expect(kinds(2.7)).toEqual(kinds(2));
  });
});

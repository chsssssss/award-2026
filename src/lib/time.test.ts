import { describe, expect, it } from "vitest";

import { REVEAL_AT } from "./constants";
import { daysUntil, formatKoreanDate, isRevealed } from "./time";

describe("isRevealed", () => {
  it("공개 1초 전에는 false", () => {
    expect(isRevealed(REVEAL_AT, new Date("2026-12-31T11:59:59Z"))).toBe(false);
  });

  it("공개 시각 정각부터 true", () => {
    expect(isRevealed(REVEAL_AT, new Date("2026-12-31T12:00:00Z"))).toBe(true);
  });

  it("공개 1초 후에는 true", () => {
    expect(isRevealed(REVEAL_AT, new Date("2026-12-31T12:00:01Z"))).toBe(true);
  });
});

describe("daysUntil (한국 날짜 기준)", () => {
  it("한국 시간 12월 30일 23:59:59에는 D-1", () => {
    // 2026-12-30T14:59:59Z = KST 12/30 23:59:59
    expect(daysUntil(REVEAL_AT, new Date("2026-12-30T14:59:59Z"))).toBe(1);
  });

  it("한국 시간 12월 31일 00:00에는 D-0", () => {
    // 2026-12-30T15:00:00Z = KST 12/31 00:00:00 (UTC 날짜로는 아직 30일)
    expect(daysUntil(REVEAL_AT, new Date("2026-12-30T15:00:00Z"))).toBe(0);
  });

  it("공개 당일 공개 직전도 D-0", () => {
    expect(daysUntil(REVEAL_AT, new Date("2026-12-31T11:59:59Z"))).toBe(0);
  });

  it("12월 17일에는 D-14", () => {
    expect(daysUntil(REVEAL_AT, new Date("2026-12-17T03:00:00Z"))).toBe(14);
  });

  it("공개일 다음 날은 음수", () => {
    expect(daysUntil(REVEAL_AT, new Date("2026-12-31T15:00:00Z"))).toBe(-1);
  });
});

describe("formatKoreanDate", () => {
  it("한국 시간 기준 월·일", () => {
    expect(formatKoreanDate(REVEAL_AT)).toBe("12월 31일");
  });

  it("UTC로는 전날이어도 한국 날짜로 보여줘요", () => {
    // 2026-12-31T15:30:00Z = KST 2027-01-01 00:30
    expect(formatKoreanDate(new Date("2026-12-31T15:30:00Z"))).toBe("1월 1일");
  });
});

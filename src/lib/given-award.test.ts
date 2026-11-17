import { afterEach, describe, expect, it, vi } from "vitest";

import {
  givenAwardKey,
  parseGivenAward,
  readGivenAwardRaw,
  saveGivenAward,
} from "./given-award";
import { gaveKey } from "./storage";
import { formatDday } from "./time";

afterEach(() => vi.unstubAllGlobals());

function stubSession() {
  const map = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  });
  return map;
}

describe("given-award", () => {
  it("저장한 상 이름·사유를 다시 읽어요", () => {
    const map = stubSession();
    expect(saveGivenAward("ab3defgh", { awardName: "웃음 지분 1위상", reason: "늘 웃겨줘서" })).toBe(
      true,
    );
    expect(map.has("given:ab3defgh")).toBe(true);
    expect(parseGivenAward(readGivenAwardRaw("ab3defgh"))).toEqual({
      awardName: "웃음 지분 1위상",
      reason: "늘 웃겨줘서",
    });
  });

  it("값이 없거나 깨졌으면 null", () => {
    stubSession();
    expect(parseGivenAward(readGivenAwardRaw("nothing1"))).toBeNull();
    expect(parseGivenAward("{oops")).toBeNull();
    expect(parseGivenAward(JSON.stringify({ awardName: "", reason: "" }))).toBeNull();
    expect(parseGivenAward(JSON.stringify({ awardName: 3, reason: "x" }))).toBeNull();
  });

  it("다른 값은 버리고 필요한 두 값만 돌려줘요", () => {
    expect(
      parseGivenAward(JSON.stringify({ awardName: "갓생 실천상", reason: "", extra: "x" })),
    ).toEqual({ awardName: "갓생 실천상", reason: "" });
  });

  it("sessionStorage가 예외를 던져도 에러 없이 처리해요", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(saveGivenAward("ab3defgh", { awardName: "x상", reason: "" })).toBe(false);
    expect(readGivenAwardRaw("ab3defgh")).toBeNull();
  });

  it("키 이름", () => {
    expect(givenAwardKey("ab3defgh")).toBe("given:ab3defgh");
    expect(gaveKey("ab3defgh")).toBe("gave:ab3defgh");
  });
});

describe("formatDday", () => {
  it("남은 날이 있으면 D-N, 당일은 D-DAY", () => {
    expect(formatDday(14)).toBe("D-14");
    expect(formatDday(1)).toBe("D-1");
    expect(formatDday(0)).toBe("D-DAY");
    expect(formatDday(-1)).toBe("D-DAY");
  });
});

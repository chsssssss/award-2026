import { describe, expect, it } from "vitest";

import { reasonText, senderLabel } from "./reveal";

describe("reveal helpers", () => {
  it("익명이거나 이름이 없으면 '익명'", () => {
    expect(senderLabel({ anonymous: false, senderName: "하은" })).toBe("하은");
    expect(senderLabel({ anonymous: true, senderName: null })).toBe("익명");
    expect(senderLabel({ anonymous: true, senderName: "숨은이름" })).toBe("익명");
    expect(senderLabel({ anonymous: false, senderName: null })).toBe("익명");
  });

  it("사유가 비었으면 null(화면에서 '(남긴 말 없음)')", () => {
    expect(reasonText({ reason: "매일 웃게 해줘서" })).toBe("매일 웃게 해줘서");
    expect(reasonText({ reason: "" })).toBeNull();
    expect(reasonText({ reason: "   " })).toBeNull();
  });
});

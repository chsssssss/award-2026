import { describe, expect, it } from "vitest";

import { normalizePrivateKey } from "./firebase-admin";

const PEM =
  "-----BEGIN PRIVATE KEY-----\nAAAA\nBBBB\n-----END PRIVATE KEY-----\n";

describe("normalizePrivateKey", () => {
  it('"\\n" 문자열을 실제 줄바꿈으로 바꿔요', () => {
    const escaped = PEM.replace(/\n/g, "\\n");
    expect(normalizePrivateKey(escaped)).toBe(PEM.trim());
  });

  it("이미 줄바꿈이 들어 있으면 그대로 둬요", () => {
    expect(normalizePrivateKey(PEM)).toBe(PEM.trim());
  });

  it("값을 감싼 따옴표를 벗겨요", () => {
    const quoted = `"${PEM.replace(/\n/g, "\\n")}"`;
    expect(normalizePrivateKey(quoted)).toBe(PEM.trim());
  });

  it("CRLF 줄바꿈도 LF로 맞춰요", () => {
    expect(normalizePrivateKey(PEM.replace(/\n/g, "\r\n"))).toBe(PEM.trim());
  });
});

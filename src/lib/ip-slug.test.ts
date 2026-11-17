import { afterEach, describe, expect, it, vi } from "vitest";

import { getClientIp, hashIp } from "./ip";
import { isValidSlug } from "./slug";

function req(headers: Record<string, string>) {
  return new Request("http://localhost/", { headers });
}

describe("getClientIp", () => {
  it("x-forwarded-for의 첫 값을 써요", () => {
    expect(getClientIp(req({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe(
      "1.2.3.4",
    );
  });

  it("없으면 x-real-ip, 그것도 없으면 unknown", () => {
    expect(getClientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(getClientIp(req({}))).toBe("unknown");
  });
});

describe("hashIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("솔트와 함께 해시하고 IP 원문은 남지 않아요", () => {
    vi.stubEnv("IP_HASH_SALT", "salt-a");
    const a = hashIp("1.2.3.4");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("1.2.3.4");
    vi.stubEnv("IP_HASH_SALT", "salt-b");
    expect(hashIp("1.2.3.4")).not.toBe(a);
  });

  it("솔트가 없으면 에러", () => {
    vi.stubEnv("IP_HASH_SALT", "");
    expect(() => hashIp("1.2.3.4")).toThrow();
  });
});

describe("isValidSlug", () => {
  it("8자 영문 소문자·숫자", () => {
    expect(isValidSlug("ab3defgh")).toBe(true);
    expect(isValidSlug("abc")).toBe(false);
    expect(isValidSlug("abcdefghi")).toBe(false);
    expect(isValidSlug("ABCDEFGH")).toBe(false);
    expect(isValidSlug("abcd-fgh")).toBe(false);
  });

  it("test-로 시작하면 40자까지", () => {
    expect(isValidSlug("test-owner")).toBe(true);
    expect(isValidSlug("test-" + "a".repeat(35))).toBe(true); // 40자
    expect(isValidSlug("test-" + "a".repeat(36))).toBe(false); // 41자
    expect(isValidSlug("test-")).toBe(false);
    expect(isValidSlug("test-Owner")).toBe(false);
  });
});

import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const request = (query: string) =>
  ({ nextUrl: new URL(`http://localhost/api/dev/sentry-test${query}`) }) as NextRequest;

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/dev/sentry-test", () => {
  it("SENTRY_TEST_KEY가 없으면 항상 404", async () => {
    vi.stubEnv("SENTRY_TEST_KEY", "");
    expect((await GET(request("?key="))).status).toBe(404);
    expect((await GET(request("?key=anything"))).status).toBe(404);
  });

  it("키가 없거나 다르면 404", async () => {
    vi.stubEnv("SENTRY_TEST_KEY", "right-key-123");
    expect((await GET(request(""))).status).toBe(404);
    expect((await GET(request("?key=wrong-key-123"))).status).toBe(404);
    expect((await GET(request("?key=right-key-12"))).status).toBe(404);
  });

  it("키가 맞으면 일부러 에러를 던져요", async () => {
    vi.stubEnv("SENTRY_TEST_KEY", "right-key-123");
    await expect(GET(request("?key=right-key-123"))).rejects.toThrow(/^Sentry test error \d+$/);
  });
});

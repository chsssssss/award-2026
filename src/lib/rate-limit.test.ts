import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/firebase-admin";
import type { FakeFirestore } from "@/test/fake-firestore";

import { rateLimit, rateLimitDocId, retryAfterSec, windowStartOf } from "./rate-limit";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const WINDOW = 600;
// 창 경계에 맞춘 시각(2026-12-01T00:00:00Z는 600초로 나누어떨어진다)
const WINDOW_START_MS = Date.UTC(2026, 11, 1);
const at = (sec: number) => new Date(WINDOW_START_MS + sec * 1000);
const KEY = `trophy:${"a".repeat(64)}`;

beforeEach(() => fake.reset());

describe("rateLimit", () => {
  it("한도 안에서는 true, 한도를 넘으면 false", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await rateLimit(KEY, 5, WINDOW, at(i))).toBe(true);
    }
    expect(await rateLimit(KEY, 5, WINDOW, at(10))).toBe(false);
    expect(await rateLimit(KEY, 5, WINDOW, at(599))).toBe(false);
  });

  it("넘친 요청은 횟수를 더 올리지 않아요", async () => {
    for (let i = 0; i < 7; i++) await rateLimit(KEY, 5, WINDOW, at(i));
    const id = rateLimitDocId(KEY, windowStartOf(at(0), WINDOW));
    expect(fake.docs.get(`rateLimits/${id}`)?.count).toBe(5);
  });

  it("다음 구간이 되면 다시 세요(초기화)", async () => {
    for (let i = 0; i < 5; i++) await rateLimit(KEY, 5, WINDOW, at(i));
    expect(await rateLimit(KEY, 5, WINDOW, at(WINDOW - 1))).toBe(false);
    expect(await rateLimit(KEY, 5, WINDOW, at(WINDOW))).toBe(true);
    const next = rateLimitDocId(KEY, windowStartOf(at(WINDOW), WINDOW));
    expect(fake.docs.get(`rateLimits/${next}`)?.count).toBe(1);
  });

  it("key가 다르면 따로 세요", async () => {
    for (let i = 0; i < 5; i++) await rateLimit(KEY, 5, WINDOW, at(i));
    expect(await rateLimit(`trophy:${"b".repeat(64)}`, 5, WINDOW, at(5))).toBe(true);
    expect(await rateLimit(`create:${"a".repeat(64)}`, 5, WINDOW, at(5))).toBe(true);
  });

  it("문서 id는 {key}_{windowStart}, 처음 만들 때 expireAt = (windowStart+2)×windowSec", async () => {
    await rateLimit(KEY, 5, WINDOW, at(30));
    const windowStart = Math.floor(WINDOW_START_MS / 1000 / WINDOW);
    expect(windowStartOf(at(30), WINDOW)).toBe(windowStart);
    const doc = fake.docs.get(`rateLimits/${KEY}_${windowStart}`)!;
    expect(doc.count).toBe(1);
    expect(doc.expireAt).toBeInstanceOf(Timestamp);
    expect((doc.expireAt as Timestamp).toMillis()).toBe((windowStart + 2) * WINDOW * 1000);
    expect(Object.keys(doc).sort()).toEqual(["count", "expireAt"]);
  });

  it("Retry-After는 이번 구간이 끝날 때까지 남은 초", () => {
    expect(retryAfterSec(at(0), WINDOW)).toBe(600);
    expect(retryAfterSec(at(599), WINDOW)).toBe(1);
    expect(retryAfterSec(at(599.5), WINDOW)).toBe(1);
  });
});

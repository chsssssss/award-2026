import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "./firebase-admin";
import {
  consumeRateLimit,
  RATE_LIMIT_RULES,
  rateLimitKey,
} from "./rate-limit";
import type { FakeFirestore } from "@/test/fake-firestore";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const IP_A = "a".repeat(64);
const IP_B = "b".repeat(64);
const { limit, windowSec } = RATE_LIMIT_RULES.createCeremony;
// 10분 창의 시작 시각(UTC 정각)
const WINDOW_START = new Date("2026-12-01T03:00:00Z");
const at = (sec: number) => new Date(WINDOW_START.getTime() + sec * 1000);

beforeEach(() => fake.reset());

describe("consumeRateLimit", () => {
  it(`같은 창에서 ${limit}번까지 허용하고 그다음은 막아요`, async () => {
    for (let i = 0; i < limit; i++) {
      const r = await consumeRateLimit("createCeremony", IP_A, at(i));
      expect(r).toEqual({ ok: true, remaining: limit - i - 1 });
    }
    const blocked = await consumeRateLimit("createCeremony", IP_A, at(60));
    expect(blocked).toEqual({ ok: false, retryAfterSec: windowSec - 60 });
  });

  it("막힌 요청은 횟수를 더 올리지 않아요", async () => {
    for (let i = 0; i < limit + 3; i++) {
      await consumeRateLimit("createCeremony", IP_A, at(i));
    }
    const key = rateLimitKey("createCeremony", IP_A, WINDOW_START.getTime());
    expect(fake.docs.get(`rateLimits/${key}`)?.count).toBe(limit);
  });

  it("다음 창이 되면 다시 허용해요", async () => {
    for (let i = 0; i < limit; i++) {
      await consumeRateLimit("createCeremony", IP_A, at(i));
    }
    expect((await consumeRateLimit("createCeremony", IP_A, at(windowSec - 1))).ok).toBe(
      false,
    );
    expect((await consumeRateLimit("createCeremony", IP_A, at(windowSec))).ok).toBe(true);
  });

  it("IP 해시가 다르면 따로 세요", async () => {
    for (let i = 0; i < limit; i++) {
      await consumeRateLimit("createCeremony", IP_A, at(i));
    }
    expect((await consumeRateLimit("createCeremony", IP_B, at(30))).ok).toBe(true);
  });

  it("문서에는 count와 창이 끝나는 expireAt만 저장해요", async () => {
    await consumeRateLimit("createCeremony", IP_A, at(5));
    const key = rateLimitKey("createCeremony", IP_A, WINDOW_START.getTime());
    expect(key).toBe(`createCeremony_${"a".repeat(32)}_${WINDOW_START.getTime() / 1000}`);
    const doc = fake.docs.get(`rateLimits/${key}`)!;
    expect(Object.keys(doc).sort()).toEqual(["count", "expireAt"]);
    expect((doc.expireAt as Timestamp).toDate()).toEqual(at(windowSec));
  });

  it("TTL 삭제가 늦어 만료된 문서가 남아 있어도 새로 세요", async () => {
    const key = rateLimitKey("createCeremony", IP_A, WINDOW_START.getTime());
    await fake.collection("rateLimits").doc(key).set({
      count: limit,
      expireAt: Timestamp.fromDate(at(-1)), // 이미 지난 값
    });
    expect(await consumeRateLimit("createCeremony", IP_A, at(10))).toEqual({
      ok: true,
      remaining: limit - 1,
    });
  });
});

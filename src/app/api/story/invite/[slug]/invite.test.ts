import { Timestamp } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as devPreview } from "@/app/api/dev/invite-preview/route";
import { REVEAL_AT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import type { FakeFirestore } from "@/test/fake-firestore";

import { GET } from "./route";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const SLUG = "jimin234";

const invite = (slug = SLUG) =>
  GET(new Request(`http://localhost/api/story/invite/${slug}`), { params: Promise.resolve({ slug }) });

/** PNG 서명과 IHDR의 가로·세로. */
async function pngSize(response: Response) {
  const buf = Buffer.from(await response.arrayBuffer());
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function seed(extra: Record<string, unknown> = {}, slug = SLUG) {
  await fake.collection("ceremonies").doc(slug).set({
    name: "지민",
    ownerTokenHash: "a".repeat(64),
    trophyCount: 3,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active",
    ...extra,
  });
}

beforeEach(() => {
  fake.reset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/story/invite/[slug]", () => {
  it("없는 slug → 404 not_found", async () => {
    const res = await invite("nothere2");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_found", message: "시상식을 찾을 수 없어요" });
  });

  it("slug 형식이 틀리면 Firestore를 읽지 않고 404", async () => {
    const res = await invite("NOT-A-SLUG");
    expect(res.status).toBe(404);
    expect(fake.reads).toEqual([]);
  });

  it("숨긴 시상식 → 404", async () => {
    await seed({ status: "hidden" });
    expect((await invite()).status).toBe(404);
  });

  it("정상: 1080×1920 PNG, 1년 immutable 캐시, 파일 이름", async () => {
    await seed();
    const res = await invite();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("Content-Disposition")).toBe('inline; filename="award-2026-invite.png"');
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1920 });
  }, 30_000);

  it("긴 이름(8자)도 그려요", async () => {
    await seed({ name: "김수한무거북이와" });
    const res = await invite();
    expect(res.status).toBe(200);
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1920 });
  }, 30_000);

  it("2,350자에 없는 글자(똠)도 에러 없이 보조 명조로 그리고, 외부에서 글꼴을 받지 않아요", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);
    await seed({ name: "똠똠이" });
    const res = await invite();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1920 });
    expect(fetchMock).not.toHaveBeenCalled(); // 구글 글꼴 내려받기 없음
  }, 30_000);

  it("Firestore 오류 → 500(로그에 slug 없음)", async () => {
    vi.spyOn(fake, "docRef").mockImplementation(() => {
      throw Object.assign(new Error("boom"), { code: 14 });
    });
    const res = await invite();
    expect(res.status).toBe(500);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("14");
    expect(logged).not.toContain(SLUG);
  });
});

describe("GET /api/dev/invite-preview", () => {
  const request = (query: string) =>
    ({ nextUrl: new URL(`http://localhost/api/dev/invite-preview${query}`) }) as NextRequest;

  it("프로덕션에서는 404", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await devPreview(request("?name=지민"))).status).toBe(404);
  });

  it("개발 중에는 이름으로 그려요", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await devPreview(request("?name=Victoria"));
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1920 });
  }, 30_000);
});

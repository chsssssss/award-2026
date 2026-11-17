import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REVEAL_AT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { RATE_LIMIT_RULES } from "@/lib/rate-limit";
import { trophyDocId } from "@/lib/voter";
import type { FakeFirestore } from "@/test/fake-firestore";

import { POST } from "./route";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const SLUG = "jimin234";
const VOTER = "V1StGXR8_Z5jdHi6B-myT"; // 21자
const IP = "203.0.113.7";
const BEFORE_REVEAL = new Date("2026-12-01T00:00:00Z");

type Body = Record<string, unknown>;
const laugh: Body = { awardId: "laugh", reason: "매일 웃게 해줘서", anonymous: false, senderName: "하은" };

function give(
  body: Body | string,
  opts: { slug?: string; voter?: string | null; ip?: string; cookie?: string } = {},
) {
  const { slug = SLUG, voter = VOTER, ip = IP } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };
  const cookie = opts.cookie ?? (voter ? `theme=dark; voterId=${voter}` : undefined);
  if (cookie) headers.cookie = cookie;
  return POST(
    new Request(`http://localhost/api/ceremonies/${slug}/trophies`, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug }) },
  );
}

const trophyPath = (voter: string, slug = SLUG) =>
  `ceremonies/${slug}/trophies/${trophyDocId(voter)}`;

async function seed(extra: Body = {}, slug = SLUG) {
  await fake.collection("ceremonies").doc(slug).set({
    name: "지민",
    ownerTokenHash: "a".repeat(64),
    trophyCount: 7,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active",
    ...extra,
  });
}

beforeEach(async () => {
  fake.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(BEFORE_REVEAL);
  vi.stubEnv("IP_HASH_SALT", "test-salt");
  vi.spyOn(console, "error").mockImplementation(() => {});
  await seed();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ceremonies/[slug]/trophies", () => {
  it("정상 생성: 201 {ok:true}, trophyCount가 1 늘어요", async () => {
    const res = await give(laugh);
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    // 다른 트로피 정보나 개수는 응답에 없다
    expect(await res.json()).toEqual({ ok: true });
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
  });

  it("문서 id는 SHA-256(voterId) 앞 20자, 정해진 필드만 저장해요", async () => {
    await give(laugh);
    const id = trophyDocId(VOTER);
    expect(id).toMatch(/^[0-9a-f]{20}$/);
    const doc = fake.docs.get(trophyPath(VOTER))!;
    expect(doc).toBeDefined();
    expect(Object.keys(doc).sort()).toEqual(
      ["anonymous", "awardId", "createdAt", "customName", "hidden", "ipHash", "reason", "senderName", "voterId"].sort(),
    );
    expect(doc).toMatchObject({
      awardId: "laugh",
      customName: null,
      reason: "매일 웃게 해줘서",
      senderName: "하은",
      anonymous: false,
      hidden: false,
      voterId: VOTER,
    });
    expect(doc.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(doc)).not.toContain(IP);
    expect(doc.createdAt).toEqual(FieldValue.serverTimestamp());
  });

  it("같은 voterId로 다시 보내면 409, 개수는 그대로", async () => {
    expect((await give(laugh)).status).toBe(201);
    const res = await give({ ...laugh, awardId: "mood" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "already_given",
      message: "이미 이 시상식에 상을 줬어요",
    });
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
    expect(fake.docs.get(trophyPath(VOTER))?.awardId).toBe("laugh");
  });

  it("다른 친구(voterId)는 따로 줄 수 있어요", async () => {
    await give(laugh);
    expect((await give(laugh, { voter: "OtherVoter_0123456789" })).status).toBe(201);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(9);
  });

  it("공개 1초 전은 받고, 공개 시각부터는 410 closed", async () => {
    vi.setSystemTime(new Date(REVEAL_AT.getTime() - 1000));
    expect((await give(laugh)).status).toBe(201);

    for (const at of [REVEAL_AT, new Date(REVEAL_AT.getTime() + 1000)]) {
      vi.setSystemTime(at);
      const res = await give(laugh, { voter: "LateVoter_01234567890" });
      expect(res.status).toBe(410);
      expect(await res.json()).toEqual({ error: "closed", message: "시상식이 끝났어요" });
    }
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
  });

  it("시상식마다 저장된 revealAt으로 판단해요", async () => {
    await seed({ revealAt: Timestamp.fromDate(new Date("2026-12-10T00:00:00Z")) }, "early234");
    vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
    expect((await give(laugh, { slug: "early234" })).status).toBe(410);
    expect((await give(laugh)).status).toBe(201); // 기본 REVEAL_AT 시상식은 아직 열려 있음
  });

  it("익명이면 senderName을 null로 저장해요", async () => {
    await give({ awardId: "food", reason: "", anonymous: true, senderName: "숨길 이름" });
    const doc = fake.docs.get(trophyPath(VOTER))!;
    expect(doc.anonymous).toBe(true);
    expect(doc.senderName).toBeNull();
    expect(JSON.stringify(doc)).not.toContain("숨길 이름");
  });

  it("직접 지은 상은 '상'을 붙여 customName에 저장해요", async () => {
    await give({ awardId: "custom", customName: "야식 요정", reason: "", anonymous: true });
    expect(fake.docs.get(trophyPath(VOTER))).toMatchObject({
      awardId: "custom",
      customName: "야식 요정상",
    });
  });

  it("프리셋에 없는 awardId는 400 invalid(field: awardId)", async () => {
    const res = await give({ ...laugh, awardId: "best_friend" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "invalid",
      field: "awardId",
      message: "상을 하나 골라주세요",
    });
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(7);
  });

  it("검증 실패는 field와 메시지를 알려줘요", async () => {
    const custom = await give({ awardId: "custom", reason: "", anonymous: true });
    expect(await custom.json()).toEqual({
      error: "invalid",
      field: "customName",
      message: "상 이름을 입력해주세요",
    });
    const noSender = await give({ awardId: "laugh", reason: "", anonymous: false });
    expect((await noSender.json()).field).toBe("senderName");
  });

  it("JSON이 아니면 400 bad_request", async () => {
    const res = await give("{oops");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
  });

  it("없거나 숨김인 시상식, 형식이 틀린 slug는 404", async () => {
    expect((await give(laugh, { slug: "nothere2" })).status).toBe(404);
    await seed({ status: "hidden" }, "hidden23");
    expect((await give(laugh, { slug: "hidden23" })).status).toBe(404);

    fake.reads.length = 0;
    const bad = await give(laugh, { slug: "BAD_SLUG" });
    expect(bad.status).toBe(404);
    expect(await bad.json()).toEqual({ error: "not_found", message: "시상식을 찾을 수 없어요" });
    expect(fake.reads).toHaveLength(0);
  });
});

describe("voterId 쿠키", () => {
  it("쿠키가 없으면 새로 만들고 Set-Cookie에 실어요", async () => {
    const res = await give(laugh, { voter: null });
    expect(res.status).toBe(201);
    const setCookie = res.headers.get("Set-Cookie")!;
    const voter = setCookie.match(/^voterId=([A-Za-z0-9_-]{21});/)?.[1];
    expect(voter).toBeDefined();
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=31536000");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("Secure"); // 테스트(개발) 환경
    // 새 voterId로 문서가 저장된다
    expect(fake.docs.get(trophyPath(voter!))?.voterId).toBe(voter);
  });

  it("프로덕션에서는 Secure를 붙여요", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await give(laugh, { voter: null });
    expect(res.headers.get("Set-Cookie")).toContain("Secure");
  });

  it("에러 응답에도 새 쿠키를 실어요", async () => {
    for (const res of [
      await give(laugh, { voter: null, slug: "BAD_SLUG" }), // 404
      await give({ awardId: "nope" }, { voter: null }), // 400
    ]) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get("Set-Cookie")).toMatch(/^voterId=[A-Za-z0-9_-]{21};/);
    }
  });

  it("쿠키가 이미 있으면 Set-Cookie를 보내지 않아요", async () => {
    const res = await give(laugh);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("형식이 틀린 voterId 쿠키는 새로 발급해요", async () => {
    const res = await give(laugh, { cookie: "voterId=short" });
    expect(res.headers.get("Set-Cookie")).toMatch(/^voterId=[A-Za-z0-9_-]{21};/);
    expect(fake.docs.has(`ceremonies/${SLUG}/trophies/${trophyDocId("short")}`)).toBe(false);
  });
});

describe("IP 요청 제한", () => {
  const { limit } = RATE_LIMIT_RULES.giveTrophy;
  const voterN = (n: number) => `Voter${String(n).padStart(16, "0")}`; // 21자

  it(`같은 IP에서 10분에 ${limit}개까지 만들고, 그다음은 429`, async () => {
    for (let i = 0; i < limit; i++) {
      expect((await give(laugh, { voter: voterN(i) })).status).toBe(201);
    }
    const res = await give(laugh, { voter: voterN(limit) });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(7 + limit);

    expect((await give(laugh, { voter: voterN(limit + 1), ip: "198.51.100.9" })).status).toBe(201);
  });

  it("중복(409)·종료(410)·검증 실패(400)는 횟수에 넣지 않아요", async () => {
    await give(laugh); // 1회
    await give(laugh); // 409
    await give({ awardId: "nope" }, { voter: voterN(1) }); // 400
    vi.setSystemTime(REVEAL_AT);
    await give(laugh, { voter: voterN(2) }); // 410
    const counts = [...fake.docs.entries()]
      .filter(([path]) => path.startsWith("rateLimits/"))
      .map(([, d]) => d.count);
    expect(counts).toEqual([1]);
  });
});

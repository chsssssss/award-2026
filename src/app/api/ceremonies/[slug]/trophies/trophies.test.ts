import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RATE_LIMIT_WINDOW_SEC, REVEAL_AT, TROPHY_RATE_LIMIT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { trophyDocId } from "@/lib/voter";
import type { FakeFirestore } from "@/test/fake-firestore";

import { POST } from "./route";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

// 욕설 필터는 실제 목록 대신 테스트 전용 가짜 단어로 검사한다.
vi.mock("@/lib/profanity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profanity")>();
  const filter = actual.createProfanityFilter({ badWords: ["나쁜말"], allowWords: ["나쁜말없음"] });
  return { ...actual, containsProfanity: filter.containsProfanity };
});

const fake = db as unknown as FakeFirestore;
const SLUG = "jimin234";
const VOTER = "V1StGXR8_Z5jdHi6B-myT"; // 21자
const IP = "203.0.113.7";
const BEFORE_REVEAL = new Date("2026-12-01T00:00:00Z");

type Body = Record<string, unknown>;
const preset: Body = { awardId: "story", reason: "매일 웃게 해줘서", anonymous: false, senderName: "하은" };

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
    const res = await give(preset);
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    // 다른 트로피 정보나 개수는 응답에 없다
    expect(await res.json()).toEqual({ ok: true });
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
  });

  it("문서 id는 SHA-256(voterId) 앞 20자, 정해진 필드만 저장해요", async () => {
    await give(preset);
    const id = trophyDocId(VOTER);
    expect(id).toMatch(/^[0-9a-f]{20}$/);
    const doc = fake.docs.get(trophyPath(VOTER))!;
    expect(doc).toBeDefined();
    expect(Object.keys(doc).sort()).toEqual(
      ["anonymous", "awardId", "createdAt", "customName", "hidden", "ipHash", "reason", "senderName", "voterId"].sort(),
    );
    expect(doc).toMatchObject({
      awardId: "story",
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
    expect((await give(preset)).status).toBe(201);
    const res = await give({ ...preset, awardId: "selfie" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "already_given",
      message: "이미 이 시상식에 상을 줬어요",
    });
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
    expect(fake.docs.get(trophyPath(VOTER))?.awardId).toBe("story");
  });

  it("다른 친구(voterId)는 따로 줄 수 있어요", async () => {
    await give(preset);
    expect((await give(preset, { voter: "OtherVoter_0123456789" })).status).toBe(201);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(9);
  });

  it("공개 1초 전은 받고, 공개 시각부터는 410 closed", async () => {
    vi.setSystemTime(new Date(REVEAL_AT.getTime() - 1000));
    expect((await give(preset)).status).toBe(201);

    for (const at of [REVEAL_AT, new Date(REVEAL_AT.getTime() + 1000)]) {
      vi.setSystemTime(at);
      const res = await give(preset, { voter: "LateVoter_01234567890" });
      expect(res.status).toBe(410);
      expect(await res.json()).toEqual({ error: "closed", message: "시상식이 끝났어요" });
    }
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(8);
  });

  it("시상식마다 저장된 revealAt으로 판단해요", async () => {
    await seed({ revealAt: Timestamp.fromDate(new Date("2026-12-10T00:00:00Z")) }, "early234");
    vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
    expect((await give(preset, { slug: "early234" })).status).toBe(410);
    expect((await give(preset)).status).toBe(201); // 기본 REVEAL_AT 시상식은 아직 열려 있음
  });

  it("익명이면 senderName을 null로 저장해요", async () => {
    await give({ awardId: "travel", reason: "", anonymous: true, senderName: "숨길 이름" });
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
    const res = await give({ ...preset, awardId: "best_friend" });
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
    const noSender = await give({ awardId: "story", reason: "", anonymous: false });
    expect((await noSender.json()).field).toBe("senderName");
  });

  it("JSON이 아니면 400 bad_request", async () => {
    const res = await give("{oops");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
  });

  it("없거나 숨김인 시상식, 형식이 틀린 slug는 404", async () => {
    expect((await give(preset, { slug: "nothere2" })).status).toBe(404);
    await seed({ status: "hidden" }, "hidden23");
    expect((await give(preset, { slug: "hidden23" })).status).toBe(404);

    fake.reads.length = 0;
    const bad = await give(preset, { slug: "BAD_SLUG" });
    expect(bad.status).toBe(404);
    expect(await bad.json()).toEqual({ error: "not_found", message: "시상식을 찾을 수 없어요" });
    expect(fake.reads).toHaveLength(0);
  });
});

describe("voterId 쿠키", () => {
  it("쿠키가 없으면 새로 만들고 Set-Cookie에 실어요", async () => {
    const res = await give(preset, { voter: null });
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
    const res = await give(preset, { voter: null });
    expect(res.headers.get("Set-Cookie")).toContain("Secure");
  });

  it("에러 응답에도 새 쿠키를 실어요", async () => {
    for (const res of [
      await give(preset, { voter: null, slug: "BAD_SLUG" }), // 404
      await give({ awardId: "nope" }, { voter: null }), // 400
    ]) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get("Set-Cookie")).toMatch(/^voterId=[A-Za-z0-9_-]{21};/);
    }
  });

  it("쿠키가 이미 있으면 Set-Cookie를 보내지 않아요", async () => {
    const res = await give(preset);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("형식이 틀린 voterId 쿠키는 새로 발급해요", async () => {
    const res = await give(preset, { cookie: "voterId=short" });
    expect(res.headers.get("Set-Cookie")).toMatch(/^voterId=[A-Za-z0-9_-]{21};/);
    expect(fake.docs.has(`ceremonies/${SLUG}/trophies/${trophyDocId("short")}`)).toBe(false);
  });
});

describe("욕설 필터", () => {
  it.each([
    ["직접 지은 상 이름", { awardId: "custom", customName: "나쁜 말", reason: "", anonymous: true }, "customName"],
    ["시상 사유", { ...preset, reason: "나1쁜말 대장" }, "reason"],
    ["닉네임", { ...preset, senderName: "나쁜말" }, "senderName"],
  ])("%s에 금지 단어 → 400 profanity(field), 저장하지 않아요", async (_label, body, field) => {
    const res = await give(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "profanity", field, message: "다른 표현으로 바꿔주세요" });
    expect(fake.creates).toHaveLength(0);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(7);
  });

  it("익명이면 닉네임은 검사하지 않아요(저장도 안 함)", async () => {
    const res = await give({ ...preset, anonymous: true, senderName: "나쁜말" });
    expect(res.status).toBe(201);
    expect(fake.docs.get(trophyPath(VOTER))?.senderName).toBeNull();
  });

  it("예외 단어가 들어간 사유는 통과", async () => {
    expect((await give({ ...preset, reason: "나쁜말없음 인증" })).status).toBe(201);
  });
});

describe("IP 요청 제한", () => {
  const voterN = (n: number) => `Voter${String(n).padStart(16, "0")}`; // 21자
  const rateCounts = () =>
    [...fake.docs.entries()].filter(([path]) => path.startsWith("rateLimits/")).map(([, d]) => d.count);

  it(`같은 IP에서 10분에 ${TROPHY_RATE_LIMIT}번까지, 그다음은 429`, async () => {
    for (let i = 0; i < TROPHY_RATE_LIMIT; i++) {
      expect((await give(preset, { voter: voterN(i) })).status).toBe(201);
    }
    const res = await give(preset, { voter: voterN(TROPHY_RATE_LIMIT) });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited", message: "잠시 후 다시 시도해 주세요" });
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_SEC);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(7 + TROPHY_RATE_LIMIT);

    // 다른 IP는 영향 없음
    expect((await give(preset, { voter: voterN(99), ip: "198.51.100.9" })).status).toBe(201);
  });

  it("다음 10분 구간이 되면 다시 받아요", async () => {
    for (let i = 0; i < TROPHY_RATE_LIMIT; i++) await give(preset, { voter: voterN(i) });
    expect((await give(preset, { voter: voterN(50) })).status).toBe(429);
    vi.setSystemTime(new Date(BEFORE_REVEAL.getTime() + RATE_LIMIT_WINDOW_SEC * 1000));
    expect((await give(preset, { voter: voterN(51) })).status).toBe(201);
  });

  it("시상식 확인(404·410) 다음, 검증(400) 전에 세요", async () => {
    await give(preset, { slug: "nothere2" }); // 404: 세지 않음
    await give(preset); // 201
    await give(preset); // 409: 셈
    await give({ awardId: "nope" }, { voter: voterN(1) }); // 400 invalid: 셈
    await give("{bad", { voter: voterN(2) }); // 400 bad_request: 셈
    await give({ ...preset, reason: "나쁜말" }, { voter: voterN(3) }); // 400 profanity: 셈
    expect(rateCounts()).toEqual([5]);

    vi.setSystemTime(REVEAL_AT);
    await give(preset, { voter: voterN(4) }); // 410: 세지 않음
    expect(rateCounts()).toEqual([5]);
  });

  it("한도에 닿으면 검증 전에 429", async () => {
    for (let i = 0; i < TROPHY_RATE_LIMIT; i++) await give({ awardId: "nope" }, { voter: voterN(i) });
    expect((await give({ awardId: "nope" }, { voter: voterN(30) })).status).toBe(429);
  });

  it("rateLimits 문서 id는 trophy:{ipHash}_{창}, IP 원문은 없어요", async () => {
    await give(preset);
    const keys = [...fake.docs.keys()].filter((key) => key.startsWith("rateLimits/"));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^rateLimits\/trophy:[0-9a-f]{64}_\d+$/);
    expect(keys[0]).not.toContain(IP);
  });
});

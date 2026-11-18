import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REVEAL_AT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import type { ManageAfterReveal } from "@/lib/manage-types";
import { hashToken } from "@/lib/token";
import type { FakeFirestore } from "@/test/fake-firestore";

import { GET } from "./route";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const SLUG = "jimin234";
const TOKEN = "TestToken_TestToken_TestToken_32";
const BEFORE_REVEAL = new Date("2026-12-01T00:00:00Z");
const AFTER_REVEAL = new Date("2026-12-31T12:00:01Z");
const TROPHIES = `ceremonies/${SLUG}/trophies`;

function manage(opts: { token?: string | null; header?: string; slug?: string } = {}) {
  const { token = TOKEN, slug = SLUG } = opts;
  const headers: Record<string, string> = {};
  if (opts.header !== undefined) headers.authorization = opts.header;
  else if (token) headers.authorization = `Bearer ${token}`;
  return GET(new Request(`http://localhost/api/manage/${slug}`, { headers }), {
    params: Promise.resolve({ slug }),
  });
}

const at = (iso: string) => Timestamp.fromDate(new Date(iso));

async function addTrophy(id: string, data: Record<string, unknown>) {
  await fake.collection(TROPHIES).doc(id).set({
    customName: null,
    reason: "",
    senderName: null,
    anonymous: true,
    hidden: false,
    voterId: `voter-${id}`,
    ipHash: `ip-${id}`,
    ...data,
  });
}

beforeEach(async () => {
  fake.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(BEFORE_REVEAL);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await fake.collection("ceremonies").doc(SLUG).set({
    name: "지민",
    ownerTokenHash: hashToken(TOKEN),
    trophyCount: 3,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active",
    createdAt: at("2026-11-20T00:00:00Z"),
  });
  await addTrophy("t1", {
    awardId: "laugh",
    reason: "매일 웃게 해줘서",
    senderName: "하은",
    anonymous: false,
    createdAt: at("2026-12-02T00:00:00Z"),
  });
  await addTrophy("t2", { awardId: "mood", reason: "텐션 담당", createdAt: at("2026-12-01T00:00:00Z") });
  await addTrophy("t3", { awardId: "laugh", reason: "웃음 지분", createdAt: at("2026-12-03T00:00:00Z") });
  fake.reads.length = 0; // 준비 과정의 읽기는 빼고 센다
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/manage/[slug] 공개 전", () => {
  it("개수만 돌려주고 awards 키가 없어요", async () => {
    const res = await manage();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body).toEqual({
      name: "지민",
      revealAt: REVEAL_AT.toISOString(),
      trophyCount: 3,
      revealed: false,
    });
    expect("awards" in body).toBe(false);
  });

  it("trophies 하위 컬렉션을 읽지 않아요", async () => {
    await manage();
    expect(fake.reads).toEqual([`ceremonies/${SLUG}`]);
    expect(fake.reads.some((path) => path.includes("/trophies"))).toBe(false);
  });

  it("응답 어디에도 트로피 내용이 없어요", async () => {
    const text = await (await manage()).text();
    for (const secret of ["매일 웃게 해줘서", "하은", "laugh", "voter-", "ip-", "ownerTokenHash"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("revealAt 1ms 전까지는 공개 전이에요", async () => {
    vi.setSystemTime(new Date(REVEAL_AT.getTime() - 1));
    expect((await (await manage()).json()).revealed).toBe(false);
    expect(fake.reads.some((path) => path.includes("/trophies"))).toBe(false);
  });
});

describe("GET /api/manage/[slug] 토큰 확인", () => {
  const unauthorized = { error: "unauthorized", message: "링크가 올바르지 않아요" };

  it.each([
    ["토큰 한 글자 다름", { token: `${TOKEN.slice(0, -1)}X` }],
    ["Authorization 헤더 없음", { token: null }],
    ["Bearer가 아닌 형식", { header: TOKEN }],
    ["없는 시상식", { slug: "nothere2" }],
    ["slug 형식 오류", { slug: "NOT-A-SLUG" }],
  ])("%s → 401", async (_label, opts) => {
    const res = await manage(opts);
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual(unauthorized);
    expect(fake.reads.some((path) => path.includes("/trophies"))).toBe(false);
  });

  it("공개 후라도 토큰이 틀리면 트로피를 읽지 않아요", async () => {
    vi.setSystemTime(AFTER_REVEAL);
    const res = await manage({ token: "WrongToken_WrongToken_WrongTok32" });
    expect(res.status).toBe(401);
    expect(fake.reads.some((path) => path.includes("/trophies"))).toBe(false);
  });

  it("Firestore 오류 → 500, 로그에 토큰·slug가 없어요", async () => {
    const spy = vi.spyOn(fake, "docRef").mockImplementation(() => {
      throw Object.assign(new Error(`boom ${TOKEN}`), { code: 14 });
    });
    const res = await manage();
    expect(res.status).toBe(500);
    spy.mockRestore();
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("14");
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(SLUG);
  });
});

describe("GET /api/manage/[slug] 공개 후", () => {
  beforeEach(() => vi.setSystemTime(AFTER_REVEAL));

  async function revealed() {
    const res = await manage();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    return (await res.json()) as ManageAfterReveal;
  }

  it("revealAt과 같은 순간부터 공개돼요", async () => {
    vi.setSystemTime(REVEAL_AT);
    expect((await revealed()).revealed).toBe(true);
  });

  it("상별로 묶고 count 많은 순, 각 상 안은 오래된 순이에요", async () => {
    const body = await revealed();
    expect(body).toMatchObject({ name: "지민", trophyCount: 3, revealed: true });
    expect(body.awards.map((a) => [a.key, a.name, a.count])).toEqual([
      ["laugh", "웃음 지분 1위상", 2],
      ["mood", "분위기 메이커상", 1],
    ]);
    expect(body.awards[0].trophies.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(body.awards[0].trophies[0]).toEqual({
      id: "t1",
      reason: "매일 웃게 해줘서",
      senderName: "하은",
      anonymous: false,
      hidden: false,
      createdAt: "2026-12-02T00:00:00.000Z",
    });
  });

  it("count가 같으면 첫 트로피를 먼저 받은 상이 앞이에요", async () => {
    await addTrophy("t4", { awardId: "mood", createdAt: at("2026-12-04T00:00:00Z") });
    // laugh 2(첫 12/2), mood 2(첫 12/1) → mood가 앞
    const body = await revealed();
    expect(body.awards.map((a) => [a.key, a.count])).toEqual([
      ["mood", 2],
      ["laugh", 2],
    ]);
  });

  it("직접 지은 상은 상 이름으로 묶고 key는 custom:이름이에요", async () => {
    await addTrophy("c1", { awardId: "custom", customName: "야식 요정상", createdAt: at("2026-11-30T00:00:00Z") });
    await addTrophy("c2", { awardId: "custom", customName: "야식 요정상", createdAt: at("2026-12-05T00:00:00Z") });
    await addTrophy("c3", { awardId: "custom", customName: "단톡방 지킴이상", createdAt: at("2026-12-06T00:00:00Z") });
    const body = await revealed();
    expect(body.awards.map((a) => [a.key, a.name, a.count])).toEqual([
      ["custom:야식 요정상", "야식 요정상", 2], // 첫 트로피(11/30)가 가장 빨라요
      ["laugh", "웃음 지분 1위상", 2],
      ["mood", "분위기 메이커상", 1],
      ["custom:단톡방 지킴이상", "단톡방 지킴이상", 1],
    ]);
    expect(body.awards[0].trophies.map((t) => t.id)).toEqual(["c1", "c2"]);
  });

  it("익명이면 senderName은 null(문서에 이름이 남아 있어도)", async () => {
    await addTrophy("a1", {
      awardId: "flex",
      senderName: "숨은이름",
      anonymous: true,
      createdAt: at("2026-12-07T00:00:00Z"),
    });
    const body = await revealed();
    const flex = body.awards.find((a) => a.key === "flex");
    expect(flex?.trophies[0]).toMatchObject({ senderName: null, anonymous: true });
    expect(JSON.stringify(body)).not.toContain("숨은이름");
  });

  it("voterId·ipHash는 응답에 없어요", async () => {
    const res = await manage();
    const text = await res.clone().text();
    expect(text).not.toContain("voterId");
    expect(text).not.toContain("ipHash");
    expect(text).not.toContain("voter-");
    expect(text).not.toContain("ip-");
    const body = (await res.json()) as ManageAfterReveal;
    for (const trophy of body.awards.flatMap((a) => a.trophies)) {
      expect(Object.keys(trophy).sort()).toEqual(
        ["anonymous", "createdAt", "hidden", "id", "reason", "senderName"].sort(),
      );
    }
  });

  it("숨김 트로피도 hidden:true로 내려가요", async () => {
    await addTrophy("h1", { awardId: "ghost", hidden: true, createdAt: at("2026-12-08T00:00:00Z") });
    const body = await revealed();
    expect(body.awards.find((a) => a.key === "ghost")?.trophies[0].hidden).toBe(true);
  });

  it("트로피가 없으면 awards는 빈 배열", async () => {
    fake.reset();
    await fake.collection("ceremonies").doc(SLUG).set({
      name: "지민",
      ownerTokenHash: hashToken(TOKEN),
      trophyCount: 0,
      revealAt: Timestamp.fromDate(REVEAL_AT),
      status: "active",
    });
    expect((await revealed()).awards).toEqual([]);
  });
});

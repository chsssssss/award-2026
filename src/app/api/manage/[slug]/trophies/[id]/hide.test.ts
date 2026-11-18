import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REVEAL_AT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import type { ManageAfterReveal } from "@/lib/manage-types";
import { hashToken } from "@/lib/token";
import type { FakeFirestore } from "@/test/fake-firestore";

import { GET } from "../../route";
import { PATCH } from "./route";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const SLUG = "jimin234";
const OTHER = "hayoon23";
const TOKEN = "TestToken_TestToken_TestToken_32";
const OTHER_TOKEN = "OtherToken_OtherToken_OtherTok32";
const MINE = "a1b2c3d4e5f6a7b8c9d0"; // 20자 hex
const THEIRS = "ffffeeeeddddccccbbbb";
const BEFORE = new Date("2026-12-01T00:00:00Z");
const AFTER = new Date("2026-12-31T12:00:01Z");

function patch(opts: { slug?: string; id?: string; token?: string | null; body?: unknown } = {}) {
  const { slug = SLUG, id = MINE, token = TOKEN, body = { hidden: true } } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return PATCH(
    new Request(`http://localhost/api/manage/${slug}/trophies/${id}`, {
      method: "PATCH",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug, id }) },
  );
}

async function seedCeremony(slug: string, token: string, trophyId: string) {
  await fake.collection("ceremonies").doc(slug).set({
    name: "지민",
    ownerTokenHash: hashToken(token),
    trophyCount: 1,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active",
  });
  await fake.collection(`ceremonies/${slug}/trophies`).doc(trophyId).set({
    awardId: "laugh",
    customName: null,
    reason: "매일 웃게 해줘서",
    senderName: "하은",
    anonymous: false,
    hidden: false,
    voterId: "voter",
    ipHash: "ip",
    createdAt: Timestamp.fromDate(new Date("2026-12-02T00:00:00Z")),
  });
}

const hiddenOf = (slug: string, id: string) => fake.docs.get(`ceremonies/${slug}/trophies/${id}`)?.hidden;

beforeEach(async () => {
  fake.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AFTER);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await seedCeremony(SLUG, TOKEN, MINE);
  await seedCeremony(OTHER, OTHER_TOKEN, THEIRS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PATCH /api/manage/[slug]/trophies/[id]", () => {
  it("공개 후: 숨기고 다시 보이기, 개수는 그대로", async () => {
    let res = await patch({ body: { hidden: true } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ id: MINE, hidden: true });
    expect(hiddenOf(SLUG, MINE)).toBe(true);
    expect(fake.docs.get(`ceremonies/${SLUG}`)?.trophyCount).toBe(1);

    // 관리 API에도 hidden으로 나온다
    const view = (await (
      await GET(new Request(`http://localhost/api/manage/${SLUG}`, { headers: { authorization: `Bearer ${TOKEN}` } }), {
        params: Promise.resolve({ slug: SLUG }),
      })
    ).json()) as ManageAfterReveal;
    expect(view.awards[0].count).toBe(1);
    expect(view.awards[0].trophies[0].hidden).toBe(true);

    res = await patch({ body: { hidden: false } });
    expect(await res.json()).toEqual({ id: MINE, hidden: false });
    expect(hiddenOf(SLUG, MINE)).toBe(false);
  });

  it("잘못된 토큰 → 401", async () => {
    for (const token of [`${TOKEN.slice(0, -1)}X`, null, OTHER_TOKEN]) {
      const res = await patch({ token });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized", message: "링크가 올바르지 않아요" });
    }
    expect(hiddenOf(SLUG, MINE)).toBe(false);
  });

  it("공개 전 → 403, 바뀌지 않아요", async () => {
    vi.setSystemTime(BEFORE);
    const res = await patch();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_revealed");
    expect(hiddenOf(SLUG, MINE)).toBe(false);
  });

  it("revealAt과 같은 순간부터 허용", async () => {
    vi.setSystemTime(REVEAL_AT);
    expect((await patch()).status).toBe(200);
  });

  it("다른 시상식의 트로피 → 404, 그 트로피는 바뀌지 않아요", async () => {
    const res = await patch({ id: THEIRS });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
    expect(hiddenOf(OTHER, THEIRS)).toBe(false);
  });

  it("없거나 형식이 틀린 트로피 id → 404", async () => {
    expect((await patch({ id: "0000000000aaaaaaaaaa" })).status).toBe(404);
    expect((await patch({ id: "../../ceremonies" })).status).toBe(404);
  });

  it("본문은 { hidden: boolean }만 허용 → 그 밖은 400", async () => {
    for (const body of [{ hidden: "yes" }, {}, { hidden: true, reason: "바꿔치기" }, { hidden: true, voterId: "x" }]) {
      const res = await patch({ body });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("invalid");
    }
    expect((await patch({ body: "{bad" })).status).toBe(400);
    expect(hiddenOf(SLUG, MINE)).toBe(false);
    expect(fake.docs.get(`ceremonies/${SLUG}/trophies/${MINE}`)?.reason).toBe("매일 웃게 해줘서");
  });

  it("Firestore 오류 → 500, 로그에 토큰·slug 없음", async () => {
    vi.spyOn(fake, "docRef").mockImplementation(() => {
      throw Object.assign(new Error(`boom ${TOKEN}`), { code: 14 });
    });
    const res = await patch();
    expect(res.status).toBe(500);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("14");
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(SLUG);
  });
});

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CREATE_RATE_LIMIT, RATE_LIMIT_WINDOW_SEC, REVEAL_AT } from "@/lib/constants";
import { db } from "@/lib/firebase-admin";
import { SLUG_ALPHABET } from "@/lib/slug";
import { hashToken } from "@/lib/token";
import type { FakeFirestore } from "@/test/fake-firestore";

import { GET } from "./[slug]/route";
import { POST } from "./route";

const h = vi.hoisted(() => ({ slugs: [] as string[] }));

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

// 충돌 테스트에서 slug 순서를 정할 수 있게 한다. 큐가 비면 실제 생성기를 쓴다.
vi.mock("@/lib/token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/token")>();
  return {
    ...actual,
    generateSlug: vi.fn(() => h.slugs.shift() ?? actual.generateSlug()),
  };
});

const fake = db as unknown as FakeFirestore;
const SITE = "https://award.example";
const BEFORE_REVEAL = new Date("2026-12-01T00:00:00Z");

function postJson(body: unknown, ip = "203.0.113.7") {
  return POST(
    new Request("http://localhost/api/ceremonies", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function getCeremony(slug: string) {
  return GET(new Request(`http://localhost/api/ceremonies/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

beforeEach(() => {
  fake.reset();
  h.slugs.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(BEFORE_REVEAL);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  vi.stubEnv("IP_HASH_SALT", "test-salt");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ceremonies", () => {
  it("이름이 9자면 400 invalid와 한국어 메시지", async () => {
    const res = await postJson({ name: "가나다라마바사아자" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "invalid",
      field: "name",
      message: "이름은 8자까지 쓸 수 있어요",
    });
    expect(fake.creates).toHaveLength(0);
  });

  it("이름이 비어 있으면 400 invalid", async () => {
    const res = await postJson({ name: "  " });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("이름을 입력해주세요");
  });

  it("JSON이 아니면 400 bad_request", async () => {
    const res = await postJson("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
  });

  it("정상 생성: 201, 저장 데이터에는 토큰 원문 없이 해시만", async () => {
    const res = await postJson({ name: " 지민 " });
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = await res.json();
    expect(body.slug).toMatch(new RegExp(`^[${SLUG_ALPHABET}]{8}$`));
    const prefix = `${SITE}/m/${body.slug}#`;
    expect(body.manageUrl.startsWith(prefix)).toBe(true);
    const token: string = body.manageUrl.slice(prefix.length);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const stored = fake.docs.get(`ceremonies/${body.slug}`);
    expect(stored).toBeDefined();
    expect(stored!.ownerTokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(Object.keys(stored!).sort()).toEqual(
      ["createdAt", "name", "ownerTokenHash", "revealAt", "status", "trophyCount"].sort(),
    );
    expect(stored!.name).toBe("지민");
    expect(stored!.trophyCount).toBe(0);
    expect(stored!.status).toBe("active");
    expect((stored!.revealAt as Timestamp).toDate()).toEqual(REVEAL_AT);
    expect(stored!.createdAt).toEqual(FieldValue.serverTimestamp());
  });

  it("slug가 이미 있으면 새 slug로 다시 시도해요", async () => {
    await fake.collection("ceremonies").doc("aaaaaaaa").set({ name: "기존1" });
    await fake.collection("ceremonies").doc("bbbbbbbb").set({ name: "기존2" });
    h.slugs.push("aaaaaaaa", "bbbbbbbb", "cccccccc");

    const res = await postJson({ name: "하은" });
    expect(res.status).toBe(201);
    expect((await res.json()).slug).toBe("cccccccc");
    expect(fake.creates).toEqual([
      "ceremonies/aaaaaaaa",
      "ceremonies/bbbbbbbb",
      "ceremonies/cccccccc",
    ]);
    // 기존 문서는 덮어쓰지 않는다
    expect(fake.docs.get("ceremonies/aaaaaaaa")).toEqual({ name: "기존1" });
  });

  it("재시도 3번까지 모두 충돌하면 500", async () => {
    const taken = ["aaaaaaaa", "bbbbbbbb", "cccccccc", "dddddddd"];
    for (const slug of taken) {
      await fake.collection("ceremonies").doc(slug).set({ name: "기존" });
    }
    h.slugs.push(...taken, "eeeeeeee");

    const res = await postJson({ name: "하은" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("server_error");
    expect(fake.creates).toHaveLength(4); // 처음 1번 + 재시도 3번
  });

  it("공개 1초 전에는 만들 수 있어요", async () => {
    vi.setSystemTime(new Date(REVEAL_AT.getTime() - 1000));
    const res = await postJson({ name: "지민" });
    expect(res.status).toBe(201);
  });

  it("공개 시각 이후에는 410 season_over", async () => {
    for (const at of [REVEAL_AT, new Date(REVEAL_AT.getTime() + 1000)]) {
      vi.setSystemTime(at);
      const res = await postJson({ name: "지민" });
      expect(res.status).toBe(410);
      expect(await res.json()).toEqual({
        error: "season_over",
        message: "올해 시상식은 끝났어요",
      });
    }
    expect(fake.creates).toHaveLength(0);
  });
});

describe("POST /api/ceremonies 욕설 필터", () => {
  it("이름에 금지 단어가 있으면 저장하지 않고 400 profanity(field: name)", async () => {
    for (const name of ["나쁜말", "나 쁜 말", "나1쁜말"]) {
      const res = await postJson({ name });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "profanity",
        field: "name",
        message: "다른 표현으로 바꿔주세요",
      });
    }
    expect(fake.creates).toHaveLength(0);
  });

  it("예외 단어는 통과", async () => {
    expect((await postJson({ name: "나쁜말없음" })).status).toBe(201);
  });
});

describe("POST /api/ceremonies 요청 횟수 제한", () => {
  const rateDocs = () =>
    [...fake.docs.keys()].filter((key) => key.startsWith("rateLimits/"));

  it(`같은 IP는 10분에 ${CREATE_RATE_LIMIT}개까지, 그다음은 429와 Retry-After`, async () => {
    for (let i = 0; i < CREATE_RATE_LIMIT; i++) {
      expect((await postJson({ name: `지민${i}` })).status).toBe(201);
    }
    const res = await postJson({ name: "하나더" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "rate_limited",
      message: "잠시 후 다시 시도해 주세요",
    });
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_SEC);
    expect(fake.creates).toHaveLength(CREATE_RATE_LIMIT); // 막힌 요청은 시상식을 만들지 않는다

    // 다른 IP는 영향 없음
    expect((await postJson({ name: "하은" }, "198.51.100.9")).status).toBe(201);
  });

  it("검증(400)보다 먼저 세요: 형식이 틀린 요청도 횟수에 들어가요", async () => {
    await postJson({ name: "" }); // 400 invalid
    await postJson("{bad"); // 400 bad_request
    await postJson({ name: "나쁜말" }); // 400 profanity
    const docs = rateDocs();
    expect(docs).toHaveLength(1);
    expect(fake.docs.get(docs[0])?.count).toBe(3);

    // 한도를 다 쓰면 검증 전에 429
    await postJson({ name: "지민" });
    await postJson({ name: "하은" });
    expect((await postJson({ name: "" })).status).toBe(429);
  });

  it("시즌이 끝났으면(410) 세지 않아요", async () => {
    vi.setSystemTime(REVEAL_AT);
    expect((await postJson({ name: "지민" })).status).toBe(410);
    expect(rateDocs()).toHaveLength(0);
  });

  it("rateLimits 문서 id는 create:{ipHash}_{창}, IP 원문은 없어요", async () => {
    await postJson({ name: "지민" });
    const keys = rateDocs();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^rateLimits\/create:[0-9a-f]{64}_\d+$/);
    expect(keys[0]).not.toContain("203.0.113.7");
    expect(JSON.stringify(fake.docs.get(keys[0]))).not.toContain("203.0.113.7");
  });

  it("IP_HASH_SALT가 없으면 500으로 막아요", async () => {
    vi.stubEnv("IP_HASH_SALT", "");
    const res = await postJson({ name: "지민" });
    expect(res.status).toBe(500);
    expect(fake.creates).toHaveLength(0);
  });
});

describe("GET /api/ceremonies/[slug]", () => {
  async function seed(slug: string, extra: Record<string, unknown> = {}) {
    await fake.collection("ceremonies").doc(slug).set({
      name: "지민",
      ownerTokenHash: "a".repeat(64),
      trophyCount: 7,
      revealAt: Timestamp.fromDate(REVEAL_AT),
      status: "active",
      ...extra,
    });
  }

  it("공개 정보만 돌려주고 캐시 헤더를 붙여요", async () => {
    await seed("jimin234");
    const res = await getCeremony("jimin234");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=10, stale-while-revalidate=30",
    );
    expect(await res.json()).toEqual({
      name: "지민",
      revealAt: "2026-12-31T12:00:00.000Z",
      trophyCount: 7,
      closed: false,
    });
  });

  it("공개 시각이 지나면 closed: true", async () => {
    await seed("jimin234");
    vi.setSystemTime(REVEAL_AT);
    expect((await (await getCeremony("jimin234")).json()).closed).toBe(true);
  });

  it("없는 시상식은 404", async () => {
    const res = await getCeremony("nothere2");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "not_found",
      message: "시상식을 찾을 수 없어요",
    });
  });

  it("숨김 처리된 시상식은 404", async () => {
    await seed("hidden23", { status: "hidden" });
    expect((await getCeremony("hidden23")).status).toBe(404);
  });

  it("slug 형식이 틀리면 Firestore를 읽지 않고 404", async () => {
    for (const slug of ["short", "UPPERCAS", "../etc/pa", "a".repeat(9)]) {
      expect((await getCeremony(slug)).status).toBe(404);
    }
    expect(fake.reads).toHaveLength(0);
  });

  it("test- slug는 조회할 수 있어요", async () => {
    await seed("test-owner-screen");
    expect((await getCeremony("test-owner-screen")).status).toBe(200);
  });
});

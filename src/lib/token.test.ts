import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { REVEAL_AT } from "./constants";
import { db } from "./firebase-admin";
import { SLUG_ALPHABET } from "./slug";
import {
  generateOwnerToken,
  generateSlug,
  hashToken,
  parseBearer,
  verifyOwner,
} from "./token";
import type { FakeFirestore } from "@/test/fake-firestore";

vi.mock("@/lib/firebase-admin", async () => {
  const { FakeFirestore } = await import("@/test/fake-firestore");
  return { db: new FakeFirestore(), getDb: () => undefined };
});

const fake = db as unknown as FakeFirestore;
const TOKEN = "kX1v9Qm3_Zp7Ld2Wc8Rt5Yh0Bn4Gf6Je";

beforeEach(async () => {
  fake.reset();
  await fake.collection("ceremonies").doc("jimin234").set({
    name: "지민",
    ownerTokenHash: hashToken(TOKEN),
    trophyCount: 3,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active",
  });
  fake.reads.length = 0;
});

describe("generateSlug / generateOwnerToken / hashToken", () => {
  it("slug는 8자, 헷갈리는 0 o 1 l i가 없어요", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(new RegExp(`^[${SLUG_ALPHABET}]{8}$`));
      expect(slug).not.toMatch(/[0o1li]/);
    }
  });

  it("토큰은 32자 base64url이고 매번 달라요", () => {
    const a = generateOwnerToken();
    const b = generateOwnerToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });

  it("hashToken은 SHA-256 hex", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("parseBearer는 Bearer 형식만 받아요", () => {
    expect(parseBearer(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearer(`bearer ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearer(TOKEN)).toBeNull();
    expect(parseBearer(`Basic ${TOKEN}`)).toBeNull();
    expect(parseBearer("Bearer ")).toBeNull();
    expect(parseBearer(null)).toBeNull();
  });
});

describe("verifyOwner", () => {
  it("맞는 토큰이면 시상식 데이터를 돌려주고 해시는 빼요", async () => {
    const ceremony = await verifyOwner("jimin234", `Bearer ${TOKEN}`);
    expect(ceremony).toMatchObject({
      slug: "jimin234",
      name: "지민",
      trophyCount: 3,
      status: "active",
      revealAt: REVEAL_AT,
    });
    expect(ceremony).not.toHaveProperty("ownerTokenHash");
  });

  it("틀린 토큰이면 null", async () => {
    expect(await verifyOwner("jimin234", `Bearer ${TOKEN}x`)).toBeNull();
    expect(await verifyOwner("jimin234", `Bearer ${"A".repeat(32)}`)).toBeNull();
  });

  it("헤더가 없거나 형식이 틀리면 Firestore를 읽지 않고 null", async () => {
    expect(await verifyOwner("jimin234", null)).toBeNull();
    expect(await verifyOwner("jimin234", TOKEN)).toBeNull();
    expect(fake.reads).toHaveLength(0);
  });

  it("다른 시상식의 토큰이나 없는 시상식이면 null", async () => {
    expect(await verifyOwner("other234", `Bearer ${TOKEN}`)).toBeNull();
  });

  it("slug 형식이 틀리면 Firestore를 읽지 않고 null", async () => {
    expect(await verifyOwner("../admin", `Bearer ${TOKEN}`)).toBeNull();
    expect(fake.reads).toHaveLength(0);
  });

  it("저장된 해시가 깨져 있어도 에러 없이 null", async () => {
    await fake
      .collection("ceremonies")
      .doc("broken23")
      .set({ name: "x", ownerTokenHash: "not-hex" });
    expect(await verifyOwner("broken23", `Bearer ${TOKEN}`)).toBeNull();
  });
});

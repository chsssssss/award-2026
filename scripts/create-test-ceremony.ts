/**
 * 테스트용 시상식 만들기 (가짜 트로피 포함)
 *
 *   npx tsx scripts/create-test-ceremony.ts --name 테스트 --trophies 14 --reveal-in -1m
 *   npx tsx scripts/create-test-ceremony.ts --trophies 0 --reveal-in 10m --local
 *
 * --name       주인공 이름(1~8자, 기본 "테스트")
 * --trophies   트로피 수(0~200, 기본 14)
 * --reveal-in  공개 시각 = 지금 + 이 값. 예) -1m(이미 공개) 10m 2h 3d. 단위 s·m·h·d(기본 -1m)
 * --local      링크를 http://localhost:3000 기준으로 출력(기본은 NEXT_PUBLIC_SITE_URL)
 *
 * slug는 "test-" + 8자라서 실제 시상식과 구분된다. 트로피는 가짜 데이터:
 * 한 상에 몰리도록 치우치게, 직접 지은 상 1~2개, 익명·사유 없음 일부.
 * 실행하면 실제 Firestore에 저장된다. 끝나면 관리 링크(토큰 포함)와 친구용 링크를 출력한다.
 */
import { createHash, randomBytes } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { customAlphabet } from "nanoid";

import { AWARDS } from "../src/lib/awards";
import { createCeremonySchema } from "../src/lib/schemas";
import { SLUG_ALPHABET } from "../src/lib/slug";
import { connectFirestore, fail } from "./lib/admin";

const USAGE =
  "사용법: npx tsx scripts/create-test-ceremony.ts [--name 테스트] [--trophies 14] [--reveal-in -1m] [--local]";

type Args = { name: string; trophies: number; revealInMs: number; local: boolean };

function parseDuration(text: string): number | null {
  const match = text.trim().match(/^(-?\d+)([smhd])$/);
  if (!match) return null;
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return Number(match[1]) * unit;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { name: "테스트", trophies: 14, revealInMs: -60_000, local: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--local") {
      args.local = true;
    } else if (flag === "--name" && value !== undefined) {
      args.name = value;
      i++;
    } else if (flag === "--trophies" && value !== undefined) {
      args.trophies = Number(value);
      i++;
    } else if (flag === "--reveal-in" && value !== undefined) {
      const ms = parseDuration(value);
      if (ms === null) fail(`--reveal-in 형식이 올바르지 않아요: ${value} (예: -1m, 10m, 2h)`);
      args.revealInMs = ms;
      i++;
    } else {
      fail(USAGE);
    }
  }
  if (!Number.isInteger(args.trophies) || args.trophies < 0 || args.trophies > 200) {
    fail("--trophies는 0~200 사이 정수여야 해요.");
  }
  const parsed = createCeremonySchema.safeParse({ name: args.name });
  if (!parsed.success) fail(`이름: ${parsed.error.issues[0]?.message ?? "올바르지 않아요"}`);
  args.name = parsed.data.name;
  return args;
}

// ---------- 가짜 데이터 ----------
const SENDERS = ["민지", "도윤", "서연", "준호", "하은", "지우", "예린", "태현", "수아", "건우", "다은", "시우"];
const REASONS = [
  "단톡방 지분의 절반은 너야",
  "3월 MT 사건은 평생 우려먹을 예정",
  "웃다가 커피 뿜은 게 벌써 세 번째",
  "네가 오면 모임 텐션이 두 배",
  "새벽 2시 전화 받아줘서 고마웠어",
  "너 따라간 집은 실패가 없었다",
  "읽씹 3일은 기본, 그래도 고맙다",
  "올해 진짜 많이 컸다",
  "계산은 늘 네가 먼저",
  "내년엔 더 멋질 듯",
];
const CUSTOM_AWARDS = ["야식 요정상", "단톡방 지킴이상"];

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** 앞쪽 상일수록 많이 뽑히게(치우친 분포): 가중치 6, 3, 2, 1, 1, ... */
function skewedAwardIds(): string[] {
  const shuffled = [...AWARDS].sort(() => Math.random() - 0.5).slice(0, 6);
  const weights = [6, 3, 2, 1, 1, 1];
  return shuffled.flatMap((award, i) => Array<string>(weights[i]).fill(award.id));
}

function fakeTrophies(count: number, revealAt: Date) {
  const pool = skewedAwardIds();
  const customCount = count === 0 ? 0 : Math.min(count, 1 + Math.floor(Math.random() * 2)); // 1~2개
  const voterId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-", 21);
  const latest = Math.min(revealAt.getTime(), Date.now()) - 60_000;

  return Array.from({ length: count }, (_, i) => {
    const custom = i < customCount;
    const anonymous = Math.random() < 0.3;
    const reason = Math.random() < 0.2 ? "" : pick(REASONS);
    const voter = voterId();
    return {
      id: createHash("sha256").update(voter).digest("hex").slice(0, 20),
      data: {
        awardId: custom ? "custom" : pick(pool),
        customName: custom ? CUSTOM_AWARDS[i % CUSTOM_AWARDS.length] : null,
        reason,
        senderName: anonymous ? null : pick(SENDERS),
        anonymous,
        hidden: false,
        voterId: voter,
        ipHash: randomBytes(32).toString("hex"), // 가짜
        // 공개 전 2주 사이에 흩어서
        createdAt: Timestamp.fromMillis(latest - Math.floor(Math.random() * 14 * 86_400_000)),
      },
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = connectFirestore();

  const slug = `test-${customAlphabet(SLUG_ALPHABET, 8)()}`;
  const token = randomBytes(24).toString("base64url");
  const revealAt = new Date(Date.now() + args.revealInMs);
  const trophies = fakeTrophies(args.trophies, revealAt);

  const ref = db.collection("ceremonies").doc(slug);
  await ref.create({
    name: args.name,
    ownerTokenHash: createHash("sha256").update(token).digest("hex"),
    trophyCount: trophies.length,
    revealAt: Timestamp.fromDate(revealAt),
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });
  for (let i = 0; i < trophies.length; i += 400) {
    const batch = db.batch();
    for (const t of trophies.slice(i, i + 400)) batch.set(ref.collection("trophies").doc(t.id), t.data);
    await batch.commit();
  }

  const site = (args.local ? "http://localhost:3000" : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const revealed = revealAt.getTime() <= Date.now();
  console.log(`테스트 시상식을 만들었어요: ${slug} (${args.name}, 트로피 ${trophies.length}개)`);
  console.log(`공개 시각: ${revealAt.toISOString()} (${revealed ? "이미 공개" : "공개 전"})`);
  console.log(`관리 링크: ${site}/m/${slug}#${token}`);
  console.log(`친구용 링크: ${site}/s/${slug}`);
}

main().catch((error: unknown) => {
  fail(`실패했어요: ${error instanceof Error ? error.message : String(error)}`);
});

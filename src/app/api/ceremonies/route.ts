import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  errorCode,
  jsonError,
  jsonOk,
  rateLimited,
  readJson,
  serverError,
} from "@/lib/api";
import { ceremonyRef } from "@/lib/ceremonies";
import { CREATE_RATE_LIMIT, RATE_LIMIT_WINDOW_SEC, REVEAL_AT } from "@/lib/constants";
import { getClientIp, hashIp } from "@/lib/ip";
import { containsProfanity } from "@/lib/profanity";
import { rateLimit, retryAfterSec } from "@/lib/rate-limit";
import { createCeremonySchema } from "@/lib/schemas";
import { isRevealed } from "@/lib/time";
import { generateOwnerToken, generateSlug, hashToken } from "@/lib/token";

/** slug 충돌(이미 존재) 시 새 slug로 다시 시도하는 횟수. 처음 1번 + 재시도 3번. */
const MAX_SLUG_RETRIES = 3;

const ALREADY_EXISTS = 6; // gRPC/REST 공통 Firestore 에러 코드

function isAlreadyExists(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === ALREADY_EXISTS
  );
}

function siteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/+$/, "");
}

/**
 * 시상식 만들기. 판단 순서: 시즌 종료(410) → 요청 제한(429) → JSON·이름 검증(400) → 욕설(400) → 생성(201).
 */
export async function POST(request: Request) {
  const now = new Date();
  if (isRevealed(REVEAL_AT, now)) {
    return jsonError(410, "season_over", "올해 시상식은 끝났어요");
  }

  // 검증보다 먼저 센다(형식이 틀린 요청을 되풀이해도 제한에 걸리게).
  try {
    const key = `create:${hashIp(getClientIp(request))}`;
    if (!(await rateLimit(key, CREATE_RATE_LIMIT, RATE_LIMIT_WINDOW_SEC, now))) {
      return rateLimited(retryAfterSec(now, RATE_LIMIT_WINDOW_SEC));
    }
  } catch (error) {
    console.error(`[ceremonies] 요청 제한 확인 실패 (code: ${errorCode(error)})`);
    return serverError();
  }

  const parsedJson = await readJson(request);
  if (!parsedJson.ok) return parsedJson.response;

  const parsed = createCeremonySchema.safeParse(parsedJson.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "이름을 확인해주세요";
    return jsonError(400, "invalid", message, { field: "name" });
  }
  if (containsProfanity(parsed.data.name)) {
    return jsonError(400, "profanity", "다른 표현으로 바꿔주세요", { field: "name" });
  }

  const token = generateOwnerToken();
  const data = {
    name: parsed.data.name,
    ownerTokenHash: hashToken(token),
    trophyCount: 0,
    revealAt: Timestamp.fromDate(REVEAL_AT),
    status: "active" as const,
    createdAt: FieldValue.serverTimestamp(),
  };

  for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug();
    try {
      await ceremonyRef(slug).create(data);
      return jsonOk(
        { slug, manageUrl: `${siteUrl(request)}/m/${slug}#${token}` },
        { status: 201 },
      );
    } catch (error) {
      if (isAlreadyExists(error)) continue;
      console.error(`[ceremonies] 생성 실패 (code: ${errorCode(error)})`);
      return serverError();
    }
  }

  console.error("[ceremonies] slug 충돌이 계속돼 생성 실패");
  return serverError();
}

import {
  badRequest,
  errorCode,
  jsonError,
  jsonOk,
  rateLimited,
  serverError,
} from "@/lib/api";
import { getPublicCeremony } from "@/lib/ceremonies";
import { RATE_LIMIT_WINDOW_SEC, TROPHY_RATE_LIMIT } from "@/lib/constants";
import { getClientIp, hashIp } from "@/lib/ip";
import { containsProfanity } from "@/lib/profanity";
import { rateLimit, retryAfterSec } from "@/lib/rate-limit";
import { createTrophySchema, type CreateTrophyData } from "@/lib/schemas";
import { isValidSlug } from "@/lib/slug";
import { giveTrophy, type GiveTrophyResult } from "@/lib/trophies";
import { newVoterId, readVoterId, voterCookieHeader } from "@/lib/voter";

const notFound = () => jsonError(404, "not_found", "시상식을 찾을 수 없어요");
const closed = () => jsonError(410, "closed", "시상식이 끝났어요");

function toResponse(result: GiveTrophyResult): Response {
  switch (result.kind) {
    case "created":
      return jsonOk({ ok: true }, { status: 201 });
    case "not_found":
      return notFound();
    case "closed":
      return closed();
    case "already_given":
      return jsonError(409, "already_given", "이미 이 시상식에 상을 줬어요");
  }
}

/** 사람이 쓴 글(직접 지은 상 이름·사유·닉네임) 중 욕설이 든 첫 칸. */
function profaneField(data: CreateTrophyData): "customName" | "reason" | "senderName" | null {
  if (data.customName && containsProfanity(data.customName)) return "customName";
  if (data.reason && containsProfanity(data.reason)) return "reason";
  if (data.senderName && containsProfanity(data.senderName)) return "senderName";
  return null;
}

/**
 * 상 주기. 판단 순서: slug·시상식 없음(404) → 종료(410) → 요청 제한(429)
 * → JSON·입력 검증(400) → 욕설(400) → 이미 줌(409) → 생성(201).
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/ceremonies/[slug]/trophies">,
) {
  const existing = readVoterId(request.headers.get("cookie"));
  const voterId = existing ?? newVoterId();
  // 쿠키를 새로 만들었으면 성공·에러 응답 모두에 실어 보낸다.
  const send = (response: Response) => {
    if (!existing) response.headers.append("Set-Cookie", voterCookieHeader(voterId));
    return response;
  };

  const { slug } = await params;
  if (!isValidSlug(slug)) return send(notFound());

  const now = new Date();
  let ipHash: string;
  try {
    const ceremony = await getPublicCeremony(slug, now);
    if (!ceremony) return send(notFound());
    if (ceremony.closed) return send(closed());

    ipHash = hashIp(getClientIp(request));
    const allowed = await rateLimit(`trophy:${ipHash}`, TROPHY_RATE_LIMIT, RATE_LIMIT_WINDOW_SEC, now);
    if (!allowed) return send(rateLimited(retryAfterSec(now, RATE_LIMIT_WINDOW_SEC)));
  } catch (error) {
    // voterId·IP·이름·메시지는 남기지 않고 에러 코드만 남긴다.
    console.error(`[trophies] 확인 실패 (code: ${errorCode(error)})`);
    return send(serverError());
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return send(badRequest());
  }

  const parsed = createTrophySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? String(issue.path[0]) : undefined;
    return send(jsonError(400, "invalid", issue?.message ?? "입력을 확인해주세요", { field }));
  }

  const badField = profaneField(parsed.data);
  if (badField) {
    return send(jsonError(400, "profanity", "다른 표현으로 바꿔주세요", { field: badField }));
  }

  try {
    const result = await giveTrophy({ slug, voterId, ipHash, data: parsed.data, now });
    return send(toResponse(result));
  } catch (error) {
    console.error(`[trophies] 상 주기 실패 (code: ${errorCode(error)})`);
    return send(serverError());
  }
}

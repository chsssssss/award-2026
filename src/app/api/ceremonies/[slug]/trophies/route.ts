import {
  badRequest,
  errorCode,
  jsonError,
  jsonOk,
  rateLimited,
  serverError,
} from "@/lib/api";
import { getClientIp, hashIp } from "@/lib/ip";
import { isValidSlug } from "@/lib/slug";
import { giveTrophy, type GiveTrophyResult } from "@/lib/trophies";
import { newVoterId, readVoterId, voterCookieHeader } from "@/lib/voter";

function toResponse(result: GiveTrophyResult): Response {
  switch (result.kind) {
    case "created":
      return jsonOk({ ok: true }, { status: 201 });
    case "not_found":
      return jsonError(404, "not_found", "시상식을 찾을 수 없어요");
    case "closed":
      return jsonError(410, "closed", "시상식이 끝났어요");
    case "bad_request":
      return badRequest();
    case "invalid":
      return jsonError(400, "invalid", result.message, { field: result.field });
    case "already_given":
      return jsonError(409, "already_given", "이미 이 시상식에 상을 줬어요");
    case "rate_limited":
      return rateLimited(result.retryAfterSec);
  }
}

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
  if (!isValidSlug(slug)) {
    return send(jsonError(404, "not_found", "시상식을 찾을 수 없어요"));
  }

  let body: { ok: true; value: unknown } | { ok: false };
  try {
    body = { ok: true, value: await request.json() };
  } catch {
    body = { ok: false };
  }

  try {
    const result = await giveTrophy({
      slug,
      voterId,
      ipHash: hashIp(getClientIp(request)),
      body,
      now: new Date(),
    });
    return send(toResponse(result));
  } catch (error) {
    // voterId·IP·이름·메시지는 남기지 않고 에러 코드만 남긴다.
    console.error(`[trophies] 상 주기 실패 (code: ${errorCode(error)})`);
    return send(serverError());
  }
}

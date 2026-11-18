import { z } from "zod";

import { errorCode, jsonError, jsonOk, readJson, serverError } from "@/lib/api";
import { checkRevealedOwner, updateTrophyHidden } from "@/lib/manage";

/** 본문은 { hidden: boolean } 하나만 받는다(다른 키가 있으면 400). */
const bodySchema = z.object({ hidden: z.boolean() }).strict();

/**
 * 메시지 숨기기/다시 보이기(주인공 전용, 공개 후에만). 관리 토큰은 Authorization: Bearer 헤더로만 받는다.
 * 판단 순서: 401 토큰 틀림 → 403 공개 전 → 400 본문 형식 → 404 이 시상식의 트로피가 아님 → 200.
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/manage/[slug]/trophies/[id]">,
) {
  const { slug, id } = await params;

  try {
    const access = await checkRevealedOwner(slug, request.headers.get("authorization"), new Date());
    if (access === "unauthorized") return jsonError(401, "unauthorized", "링크가 올바르지 않아요");
    if (access === "not_revealed") {
      return jsonError(403, "not_revealed", "결과가 공개된 뒤에 숨길 수 있어요");
    }

    const parsedJson = await readJson(request);
    if (!parsedJson.ok) return parsedJson.response;
    const body = bodySchema.safeParse(parsedJson.body);
    if (!body.success) return jsonError(400, "invalid", "요청 형식이 올바르지 않아요");

    const found = await updateTrophyHidden(slug, id, body.data.hidden);
    if (!found) return jsonError(404, "not_found", "메시지를 찾을 수 없어요");
    return jsonOk({ id, hidden: body.data.hidden });
  } catch (error) {
    // 토큰·slug·내용은 남기지 않는다
    console.error(`[manage/trophies] 숨기기 실패 (code: ${errorCode(error)})`);
    return serverError();
  }
}

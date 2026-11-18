import { errorCode, jsonError, jsonOk, serverError } from "@/lib/api";
import { getManageData } from "@/lib/manage";

/**
 * 주인공용 조회. 관리 토큰은 Authorization: Bearer 헤더로만 받는다.
 * 공개 전에는 개수만, 공개 후에는 상별 트로피까지. 항상 no-store.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/manage/[slug]">) {
  const { slug } = await params;
  const authorization = request.headers.get("authorization");

  try {
    const data = await getManageData(slug, authorization, new Date());
    if (!data) return jsonError(401, "unauthorized", "링크가 올바르지 않아요");
    return jsonOk(data); // Cache-Control: no-store
  } catch (error) {
    // 토큰·slug는 남기지 않는다
    console.error(`[manage] 조회 실패 (code: ${errorCode(error)})`);
    return serverError();
  }
}

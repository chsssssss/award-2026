import { errorCode, jsonError, serverError } from "@/lib/api";
import { getPublicCeremony } from "@/lib/ceremonies";
import { renderInviteStory } from "@/lib/story/invite";

/**
 * 인스타 스토리용 초대 이미지(1080×1920 PNG). Node 런타임(기본값).
 * 없거나 숨긴 시상식은 404. 이름은 바뀌지 않으므로 오래 캐시한다.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/story/invite/[slug]">) {
  const { slug } = await params; // [slug]는 미리 만들 수 없어서 요청마다 실행된다

  try {
    // slug 형식이 틀리면 Firestore를 읽지 않고 null
    const ceremony = await getPublicCeremony(slug, new Date());
    if (!ceremony) return jsonError(404, "not_found", "시상식을 찾을 수 없어요");

    const image = await renderInviteStory(ceremony.name);
    // 다 그린 뒤에 응답한다(그리다 실패하면 깨진 이미지 대신 500)
    const body = await image.arrayBuffer();
    return new Response(body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": 'inline; filename="award-2026-invite.png"',
      },
    });
  } catch (error) {
    console.error(`[story/invite] 이미지 생성 실패 (code: ${errorCode(error)})`);
    return serverError();
  }
}

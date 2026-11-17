import { errorCode, jsonError, jsonOk, serverError } from "@/lib/api";
import { getPublicCeremony } from "@/lib/ceremonies";

const notFound = () =>
  jsonError(404, "not_found", "시상식을 찾을 수 없어요");

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/ceremonies/[slug]">,
) {
  const { slug } = await params;

  try {
    // slug 형식이 틀리면 getPublicCeremony가 Firestore를 읽지 않고 null을 돌려준다.
    const ceremony = await getPublicCeremony(slug, new Date());
    if (!ceremony) return notFound();

    return jsonOk(
      {
        name: ceremony.name,
        revealAt: ceremony.revealAt.toISOString(),
        trophyCount: ceremony.trophyCount,
        closed: ceremony.closed,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error(`[ceremonies/slug] 조회 실패 (code: ${errorCode(error)})`);
    return serverError();
  }
}

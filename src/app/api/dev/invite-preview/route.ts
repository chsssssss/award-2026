import type { NextRequest } from "next/server";

import { normalizeText } from "@/lib/schemas";
import { renderInviteStory } from "@/lib/story/invite";

/**
 * 개발 전용: 초대 스토리 이미지를 이름만 바꿔 그려 본다. 프로덕션에서는 404.
 * /api/dev/invite-preview?name=지민
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  const name = normalizeText(request.nextUrl.searchParams.get("name") ?? "") || "지민";
  return renderInviteStory(name, { headers: { "Cache-Control": "no-store" } });
}

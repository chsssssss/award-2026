import type { NextRequest } from "next/server";

import { renderCeremonyImage, renderDefaultImage } from "@/lib/og-image";
import { normalizeText } from "@/lib/schemas";

/**
 * 개발 전용: 링크 미리보기 이미지를 이름만 바꿔 그려 본다. 프로덕션에서는 404.
 * /api/dev/og-preview?name=지민 (name이 없으면 사이트 기본 이미지)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  const name = normalizeText(request.nextUrl.searchParams.get("name") ?? "");
  return name ? renderCeremonyImage(name) : renderDefaultImage();
}

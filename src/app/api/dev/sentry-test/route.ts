import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

/**
 * Sentry 연결 확인용: ?key= 값이 환경변수 SENTRY_TEST_KEY와 같을 때만 일부러 에러를 던진다.
 * 키가 없거나 다르면 404(존재를 드러내지 않는다). 프로덕션에서도 키를 아는 사람만 쓸 수 있다.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.SENTRY_TEST_KEY?.trim();
  const given = request.nextUrl.searchParams.get("key") ?? "";
  if (!expected || !sameKey(given, expected)) {
    return new Response("Not Found", { status: 404 });
  }
  throw new Error(`Sentry test error ${Date.now()}`);
}

function sameKey(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

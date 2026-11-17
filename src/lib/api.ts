import "server-only";

// API 응답 헬퍼. 에러 형식: { error: 코드, message: 화면에 보여줄 한국어 }

const NO_STORE = "no-store";

function withDefaultCache(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", NO_STORE);
  return { ...init, headers };
}

/** 성공 응답. Cache-Control을 따로 주지 않으면 no-store. */
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, withDefaultCache(init));
}

/** 에러 응답. extra로 field 같은 값을 더할 수 있다. 항상 no-store. */
export function jsonError(
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json(
    { error, message, ...extra },
    { status, headers: { "Cache-Control": NO_STORE } },
  );
}

export const badRequest = () =>
  jsonError(400, "bad_request", "요청 형식이 올바르지 않아요");

export const serverError = () =>
  jsonError(500, "server_error", "잠시 후 다시 시도해주세요");

/** 429. Retry-After 헤더(초)를 같이 보낸다. */
export function rateLimited(retryAfterSec: number): Response {
  return Response.json(
    { error: "rate_limited", message: "요청이 많아요. 잠시 후 다시 시도해주세요" },
    {
      status: 429,
      headers: {
        "Cache-Control": NO_STORE,
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/** 요청 body를 JSON으로 읽는다. 실패하면 400 bad_request 응답을 돌려준다. */
export async function readJson(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: badRequest() };
  }
}

/** 로그에 남겨도 되는 에러 코드만 꺼낸다(메시지에는 입력값이 섞일 수 있어 남기지 않는다). */
export function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return error instanceof Error ? error.name : "unknown";
}

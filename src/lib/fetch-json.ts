// 클라이언트에서 우리 API를 부를 때 쓰는 fetch 래퍼.
// 서버 에러는 응답의 message를 그대로 쓰고, 네트워크 오류는 정해진 문장으로 바꾼다.

export const NETWORK_ERROR_MESSAGE = "연결이 불안정해요. 다시 시도해 주세요";
export const UNKNOWN_ERROR_MESSAGE = "잠시 후 다시 시도해주세요";

export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure = {
  ok: false;
  /** 네트워크 오류·중단이면 null */
  status: number | null;
  error: string;
  message: string;
  field?: string;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    if (isAbort(error)) {
      return { ok: false, status: null, error: "aborted", message: "" };
    }
    return {
      ok: false,
      status: null,
      error: "network",
      message: NETWORK_ERROR_MESSAGE,
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch (error) {
    if (isAbort(error)) {
      return { ok: false, status: null, error: "aborted", message: "" };
    }
    body = null; // HTML 에러 페이지 등 JSON이 아닌 응답
  }

  if (res.ok && body !== null) {
    return { ok: true, status: res.status, data: body as T };
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    ok: false,
    status: res.status,
    error: typeof record.error === "string" ? record.error : "unknown",
    message:
      typeof record.message === "string" && record.message
        ? record.message
        : UNKNOWN_ERROR_MESSAGE,
    field: typeof record.field === "string" ? record.field : undefined,
  };
}

export function postJson<T>(url: string, data: unknown, init?: RequestInit) {
  return fetchJson<T>(url, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(data),
  });
}

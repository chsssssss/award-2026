// 분석 도구로 보내는 주소 정리. 관리 링크의 # 뒤(토큰)나 쿼리의 값이 밖으로 나가지 않게 한다.

/** 쿼리 중 남겨도 되는 값. ref(유입 경로)만 남긴다. */
const SAFE_REF = /^[A-Za-z0-9_-]{1,64}$/;

/** # 뒤를 지우고, 쿼리는 형식이 맞는 ref만 남긴다. URL이 아니면 # 와 ? 뒤를 잘라낸다. */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const ref = url.searchParams.get("ref");
    url.hash = "";
    url.search = ref && SAFE_REF.test(ref) ? `?ref=${ref}` : "";
    return url.toString();
  } catch {
    return raw.split("#")[0].split("?")[0];
  }
}

type Props = Record<string, unknown>;

/**
 * 보내지 않는 속성. PostHog는 페이지뷰에 문서 제목(title)을 자동으로 붙이는데,
 * 친구 화면 제목("OO님의 2026 시상식")에 주인공 이름이 들어 있어서 뺀다.
 */
export const DENIED_PROPERTIES: readonly string[] = ["title", "$title"];

/**
 * 분석 도구로 보내기 전 속성 정리.
 * - DENIED_PROPERTIES는 뺀다.
 * - 값이 http(s) 주소인 속성은 모두 sanitizeUrl로 바꾼다($current_url, $referrer, $initial_current_url 등).
 */
export function sanitizeProperties<T extends Props | undefined>(props: T): T {
  if (!props) return props;
  const out: Props = {};
  for (const [key, value] of Object.entries(props)) {
    if (DENIED_PROPERTIES.includes(key)) continue;
    out[key] = typeof value === "string" && /^https?:\/\//i.test(value) ? sanitizeUrl(value) : value;
  }
  return out as T;
}

/** ?ref= 값. 없으면 "direct", 형식이 이상하면 "other". */
export function refFromSearch(search: string): string {
  try {
    const ref = new URLSearchParams(search).get("ref");
    if (!ref) return "direct";
    return SAFE_REF.test(ref) ? ref : "other";
  } catch {
    return "direct";
  }
}

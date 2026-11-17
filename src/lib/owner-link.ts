// 관리 링크(/m/[slug]#[token]) 다루기. 토큰은 URL 해시에만 있고 서버로 보내는 주소에는 들어가지 않는다.

/** location.hash에서 관리 토큰을 꺼낸다. 형식이 틀리면 null. */
export function parseOwnerToken(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  let token: string;
  try {
    token = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : null;
}

/** 복사·캘린더에 넣을 정리된 관리 링크(쿼리 등 다른 값은 뺀다). */
export function buildManageUrl(origin: string, slug: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/m/${slug}#${token}`;
}

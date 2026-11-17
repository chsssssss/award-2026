// localStorage 접근. 인앱 브라우저·사생활 보호 모드에서는 접근 자체가 예외를 던질 수 있어
// 항상 try/catch로 감싼다(CLAUDE.md).

export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** 저장에 성공하면 true. */
export function writeStorage(key: string, value: string): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** 이 브라우저에서 관리 링크 저장 안내를 확인했다는 표시. */
export const savedLinkKey = (slug: string) => `saved:${slug}`;

/** 이 브라우저에서 이 시상식에 상을 줬다는 표시(localStorage). */
export const gaveKey = (slug: string) => `gave:${slug}`;

export function readSession(key: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** 저장에 성공하면 true. */
export function writeSession(key: string, value: string): boolean {
  try {
    if (!globalThis.sessionStorage) return false;
    globalThis.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

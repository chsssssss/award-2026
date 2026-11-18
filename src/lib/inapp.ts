// 인앱 브라우저 감지. 인스타그램·카카오톡 인앱 브라우저는 파일 다운로드와 클립보드가 불안정하다.

/**
 * - "instagram" / "kakaotalk": 해당 앱의 인앱 브라우저
 * - "other": 그 밖의 브라우저(사파리, 크롬 등)
 * - null: User-Agent를 모름(서버 렌더링 등)
 */
export type InAppBrowser = "instagram" | "kakaotalk" | "other" | null;

export function getInAppBrowser(userAgent: string | null | undefined): InAppBrowser {
  if (!userAgent) return null;
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/KAKAOTALK/i.test(userAgent)) return "kakaotalk";
  return "other";
}

/** 인스타그램·카카오톡 인앱 브라우저인지. */
export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  const browser = getInAppBrowser(userAgent);
  return browser === "instagram" || browser === "kakaotalk";
}

export function isIOS(userAgent: string | null | undefined): boolean {
  return !!userAgent && /iPhone|iPad|iPod/i.test(userAgent);
}

export function isAndroid(userAgent: string | null | undefined): boolean {
  return !!userAgent && /Android/i.test(userAgent);
}

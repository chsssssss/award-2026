// 이미지 공유(Web Share) 도우미. 휴대폰 공유 창으로 이미지를 넘겨 인스타그램 → 스토리로 바로 올리게 한다.
// 웹에서는 인스타 스토리 편집 화면을 이미지와 함께 직접 여는 공식 방법이 없어서(앱 전용) 공유 창을 쓴다.
// 공유를 못 하면 화면에서 "길게 눌러 저장" 안내로 넘어간다.

/** 이미지 주소를 받아 File로 만든다. */
export async function fetchImageFile(
  url: string,
  fileName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<File> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
}

/**
 * - shared: 공유 시트에서 무언가를 골랐음
 * - cancelled: 사용자가 공유 시트를 닫음(AbortError) → 에러로 보이지 않는다
 * - unsupported: 이 브라우저는 파일 공유를 못 함
 * - failed: 공유하다 실패(권한 등)
 */
export type ShareResult = "shared" | "cancelled" | "unsupported" | "failed";

type ShareNavigator = Pick<Navigator, "share" | "canShare">;

/** 이 브라우저가 이 파일을 공유 창(인스타그램 등)으로 보낼 수 있는지. */
export function canShareFile(
  file: File,
  nav: Partial<ShareNavigator> | undefined = typeof navigator === "undefined" ? undefined : navigator,
): boolean {
  if (!nav?.share || !nav.canShare) return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareImageFile(
  file: File,
  title: string,
  nav: Partial<ShareNavigator> | undefined = typeof navigator === "undefined" ? undefined : navigator,
): Promise<ShareResult> {
  if (!nav?.share || !canShareFile(file, nav)) return "unsupported";

  try {
    await nav.share({ files: [file], title });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

// 이미지 저장(Web Share) 도우미. 인앱 브라우저에서는 다운로드가 막히는 일이 많아서
// 공유 시트("이미지 저장")를 먼저 쓰고, 안 되면 화면에서 "길게 눌러 저장" 안내로 넘어간다.

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

export async function shareImageFile(
  file: File,
  title: string,
  nav: Partial<ShareNavigator> | undefined = typeof navigator === "undefined" ? undefined : navigator,
): Promise<ShareResult> {
  if (!nav?.share || !nav.canShare) return "unsupported";
  let can = false;
  try {
    can = nav.canShare({ files: [file] });
  } catch {
    can = false;
  }
  if (!can) return "unsupported";

  try {
    await nav.share({ files: [file], title });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

// 클립보드 복사. 인앱 브라우저에서는 Clipboard API가 막히는 일이 많아서 예전 방식까지 시도한다.

/** Clipboard API가 없을 때 쓰는 예전 방식. 클릭 직후(사용자 동작 안)에서만 동작한다. */
function legacyCopy(text: string): boolean {
  // 임시 textarea로 포커스가 옮겨 갔다가 지워지면 포커스가 사라지므로 끝나면 되돌린다
  const previousFocus = document.activeElement as HTMLElement | null;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.fontSize = "16px"; // iOS 확대 방지
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  } finally {
    previousFocus?.focus?.({ preventScroll: true });
  }
}

/** Clipboard API → execCommand 순서로 복사한다. 둘 다 실패하면 false(직접 복사하도록 안내). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한 거부·인앱 브라우저 제한 등. 아래 방법으로 넘어간다.
  }
  return legacyCopy(text);
}

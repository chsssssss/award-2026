import { useCallback, useEffect, useState } from "react";

import { copyText } from "./clipboard";

/** idle: 아직 안 함 · copied: 복사됨(잠시 뒤 idle) · manual: 자동 복사 실패(직접 복사 안내) */
export type CopyState = "idle" | "copied" | "manual";

/**
 * 클립보드 복사 상태. copyText(Clipboard API → execCommand)로 복사하고,
 * 둘 다 실패하면 manual이 되어 화면이 선택 가능한 입력창을 보여준다.
 */
export function useCopy(resetMs = 2000) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), resetMs);
    return () => clearTimeout(timer);
  }, [state, resetMs]);

  const copy = useCallback(async (text: string) => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "manual");
    return ok;
  }, []);

  return { state, copy };
}

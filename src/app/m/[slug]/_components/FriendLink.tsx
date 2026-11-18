"use client";

import { useEffect, useId, useRef, useState } from "react";

import { copyText } from "@/lib/clipboard";
import { displayUrl } from "@/lib/owner-link";

type CopyState = "idle" | "copied" | "manual";

/** "내 시상식 링크": 친구에게 보낼 /s/[slug] 주소와 복사 버튼. 관리 링크(토큰)는 절대 넣지 않는다. */
export function FriendLink({ url }: { url: string }) {
  const labelId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copy() {
    if (await copyText(url)) {
      setCopyState("copied");
      return;
    }
    // 자동 복사가 막히면 전체 주소를 선택해 두고 길게 눌러 복사하도록 안내
    setCopyState("manual");
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
  }

  return (
    <div className="mt-5">
      <label id={labelId} htmlFor={`${labelId}-input`} className="text-[13px] font-medium text-muted">
        내 시상식 링크
      </label>
      <div className="mt-2 flex gap-2">
        <input
          ref={input}
          id={`${labelId}-input`}
          readOnly
          value={copyState === "manual" ? url : displayUrl(url)}
          onFocus={(e) => e.currentTarget.select()}
          aria-describedby={hintId}
          className="h-[52px] min-w-0 flex-1 truncate rounded-[14px] border border-line bg-card-2 px-4 text-[15px] text-ink outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={copy}
          className="h-[52px] w-[76px] shrink-0 rounded-[14px] border border-gold text-[15px] font-bold text-gold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light active:bg-card-2"
        >
          {copyState === "copied" ? "복사됨" : "복사"}
        </button>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-normal text-subtle">
        {copyState === "manual"
          ? "자동으로 복사되지 않았어요. 주소를 길게 눌러 복사해 주세요"
          : "친구들에게 보낼 주소예요. 관리 링크와는 달라요"}
      </p>
      <p aria-live="polite" className="sr-only">
        {copyState === "copied" ? "친구에게 보낼 링크를 복사했어요" : ""}
      </p>
    </div>
  );
}

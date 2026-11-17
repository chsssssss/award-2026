"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/Button";
import { buildRevealIcs, googleCalendarUrl } from "@/lib/calendar";
import { savedLinkKey, writeStorage } from "@/lib/storage";

type Props = {
  slug: string;
  manageUrl: string;
  revealAt: Date;
  onSaved: () => void;
};

type CopyState = "idle" | "copied" | "manual";

/** Clipboard API가 없을 때 쓰는 예전 방식. 클릭 직후(사용자 동작 안)에서만 동작한다. */
function legacyCopy(text: string): boolean {
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
  }
}

function selectAll(input: HTMLInputElement | null) {
  if (input) {
    input.focus();
    input.select();
  }
}

export function SaveLinkCard({ slug, manageUrl, revealAt, onSaved }: Props) {
  const titleId = useId();
  const calendarId = useId();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [icsFailed, setIcsFailed] = useState(false);

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyLink() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(manageUrl);
        setCopyState("copied");
        return;
      } catch {
        // 권한 거부·인앱 브라우저 제한 등. 아래 방법으로 넘어간다.
      }
    }
    if (legacyCopy(manageUrl)) {
      setCopyState("copied");
      return;
    }
    setCopyState("manual");
  }

  function downloadIcs() {
    try {
      const ics = buildRevealIcs({ slug, revealAt, manageUrl });
      const url = URL.createObjectURL(
        new Blob([ics], { type: "text/calendar;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "award-2026-reveal.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setIcsFailed(false);
    } catch {
      setIcsFailed(true);
    }
  }

  function markSaved() {
    writeStorage(savedLinkKey(slug), String(Date.now()));
    onSaved(); // 저장에 실패해도(인앱 브라우저 등) 이번에는 카드를 접는다
  }

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-[20px] border-[1.5px] border-gold bg-card p-5"
    >
      <h2 id={titleId} className="text-[17px] font-bold">
        이 링크를 꼭 저장하세요
      </h2>
      <p className="mt-2 text-sm leading-[1.6] text-muted">
        이 링크가 있어야 12월 31일에 결과를 볼 수 있어요. 잊어버리면 다시 찾을 수
        없어요.
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <Button onClick={copyLink}>
          {copyState === "copied" ? "복사했어요" : "링크 복사"}
        </Button>
        <p aria-live="polite" className="sr-only">
          {copyState === "copied" ? "링크를 복사했어요" : ""}
        </p>

        {copyState === "manual" && (
          <div>
            <input
              ref={selectAll}
              readOnly
              value={manageUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="관리 링크"
              aria-describedby={`${titleId}-manual`}
              className="h-12 w-full rounded-[14px] border border-line bg-card-2 px-3 text-base text-ink outline-none focus:border-gold"
            />
            <p id={`${titleId}-manual`} className="mt-1.5 text-xs text-muted">
              자동으로 복사되지 않았어요. 링크를 길게 눌러 복사해 주세요
            </p>
          </div>
        )}

        <Button
          variant="outline"
          aria-expanded={calendarOpen}
          aria-controls={calendarId}
          onClick={() => setCalendarOpen((open) => !open)}
        >
          캘린더에 공개일 추가
        </Button>
        <div
          id={calendarId}
          hidden={!calendarOpen}
          className="grid grid-cols-2 gap-2.5"
        >
          <Button
            variant="outline"
            href={googleCalendarUrl(revealAt, manageUrl)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 캘린더
          </Button>
          <Button variant="outline" onClick={downloadIcs}>
            아이폰 캘린더(.ics)
          </Button>
        </div>
        {icsFailed && (
          <p className="text-[13px] text-danger">
            파일을 만들지 못했어요. Google 캘린더를 써 주세요
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={markSaved}
        className="mt-2 h-11 w-full rounded-[14px] text-sm font-medium text-muted transition-colors active:bg-card-2"
      >
        저장했어요
      </button>
    </section>
  );
}

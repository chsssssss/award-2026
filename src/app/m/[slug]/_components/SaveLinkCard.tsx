"use client";

import { useId, useState } from "react";

import { Button } from "@/components/Button";
import { ManualCopyField } from "@/components/ManualCopyField";
import { buildRevealIcs, googleCalendarUrl } from "@/lib/calendar";
import { savedLinkKey, writeStorage } from "@/lib/storage";
import { formatKoreanDate } from "@/lib/time";
import { track } from "@/lib/track";
import { useCopy } from "@/lib/use-copy";

type Props = {
  slug: string;
  manageUrl: string;
  revealAt: Date;
  /** 공개 후면 "다시 볼 수 있어요" 문구, 캘린더 추가는 숨김 */
  revealed?: boolean;
  onSaved: () => void;
};

export function SaveLinkCard({ slug, manageUrl, revealAt, revealed = false, onSaved }: Props) {
  const titleId = useId();
  const calendarId = useId();
  const { state: copyState, copy } = useCopy();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [icsFailed, setIcsFailed] = useState(false);

  async function copyLink() {
    if (await copy(manageUrl)) void track("manage_link_saved", { method: "copy" });
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
      void track("manage_link_saved", { method: "ics" });
    } catch {
      setIcsFailed(true);
    }
  }

  function markSaved() {
    void track("manage_link_saved", { method: "confirm" });
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
        {revealed
          ? "이 링크로 언제든 결과를 다시 볼 수 있어요. 잊어버리면 다시 찾을 수 없어요."
          : `이 링크가 있어야 ${formatKoreanDate(revealAt)}에 결과를 볼 수 있어요. 잊어버리면 다시 찾을 수 없어요.`}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <Button onClick={copyLink}>
          {copyState === "copied" ? "복사했어요" : "링크 복사"}
        </Button>
        <p aria-live="polite" className="sr-only">
          {copyState === "copied" ? "링크를 복사했어요" : ""}
        </p>

        {copyState === "manual" && <ManualCopyField value={manageUrl} label="관리 링크" />}

        {/* 공개 후에는 캘린더에 넣을 일정이 없다 */}
        {!revealed && (
          <>
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
                onClick={() => void track("manage_link_saved", { method: "google_calendar" })}
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
          </>
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

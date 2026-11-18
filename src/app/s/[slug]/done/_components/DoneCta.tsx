"use client";

import { Button } from "@/components/Button";
import { track } from "@/lib/track";

/** 완료 화면의 "내 시상식 열기". 누르면 done_cta_click을 기록한다. */
export function DoneCta({ className }: { className?: string }) {
  return (
    <Button href="/?ref=done" className={className} onClick={() => void track("done_cta_click")}>
      내 시상식 열기
    </Button>
  );
}

"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseGivenAward, readGivenAwardRaw } from "@/lib/given-award";

const subscribeNothing = () => () => {};

/** "내가 준 상" 카드. 이 탭의 sessionStorage에 값이 없으면 그리지 않는다. */
export function GivenAwardCard({ slug }: { slug: string }) {
  const raw = useSyncExternalStore(
    subscribeNothing,
    () => readGivenAwardRaw(slug),
    () => null,
  );
  const award = useMemo(() => parseGivenAward(raw), [raw]);
  if (!award) return null;

  return (
    <div className="mt-7 flex flex-col gap-1.5 rounded-[20px] bg-card p-5">
      <span className="text-[13px] text-muted">내가 준 상</span>
      <span className="font-display text-[22px] font-extrabold text-gold">{award.awardName}</span>
      {award.reason && <span className="text-sm leading-normal">“{award.reason}”</span>}
    </div>
  );
}

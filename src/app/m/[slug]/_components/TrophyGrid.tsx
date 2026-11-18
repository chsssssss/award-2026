import { useId } from "react";

import { LockIcon } from "@/components/icons";
import { TrophyIcon } from "@/components/TrophyIcon";
import { trophySlots } from "@/lib/trophy-slots";

const cell = "h-[72px] rounded-[14px]";
const appear = "animate-trophy-in motion-reduce:animate-none";

type Props = {
  count: number;
  /** 트로피가 늘기 전 개수. 이 번호부터의 칸이 살짝 나타난다. */
  newFrom: number | null;
};

/** "도착한 트로피 N개" 카드. 어떤 상인지는 보여주지 않고 잠긴 트로피만 그린다. */
export function TrophyGrid({ count, newFrom }: Props) {
  const titleId = useId();
  const slots = trophySlots(count);

  return (
    <section aria-labelledby={titleId} className="mt-4 rounded-[20px] bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 id={titleId} className="text-[15px] font-bold">
          도착한 트로피
        </h2>
        <span aria-live="polite" className="text-[15px] font-bold text-gold">
          {count}개
        </span>
      </div>

      <ul aria-hidden="true" className="mt-3.5 grid grid-cols-4 gap-2.5">
        {slots.map((slot, i) => {
          if (slot.kind === "empty") {
            return (
              <li key={i} className={`${cell} border-[1.5px] border-dashed border-line`} />
            );
          }
          if (slot.kind === "more") {
            return (
              // 개수가 바뀔 때마다 다시 그려서 효과가 한 번 더 나온다
              <li
                key={`more-${slot.count}`}
                className={`${cell} flex items-center justify-center bg-[#1A1727] text-[15px] font-bold text-gold ${
                  newFrom !== null ? appear : ""
                }`}
              >
                +{slot.count}
              </li>
            );
          }
          const isNew = newFrom !== null && i >= newFrom;
          return (
            <li
              key={i}
              className={`${cell} flex items-center justify-center bg-[#1A1727] ${isNew ? appear : ""}`}
            >
              <TrophyIcon variant="locked" size={40} />
            </li>
          );
        })}
      </ul>

      {count === 0 && (
        <p className="mt-3.5 text-center text-sm text-muted">첫 트로피를 기다리고 있어요</p>
      )}

      <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-muted">
        <LockIcon size={14} />
        <span>어떤 상인지는 공개 날까지 비밀이에요</span>
      </p>
    </section>
  );
}

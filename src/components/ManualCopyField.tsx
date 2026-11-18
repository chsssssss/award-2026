"use client";

import { useEffect, useId, useRef } from "react";

/**
 * 자동 복사가 막혔을 때 보여주는 선택 가능한 입력창.
 * autoSelect면 처음 보일 때 주소 전체를 선택해 둔다(복사 버튼을 누른 직후에 쓴다).
 */
export function ManualCopyField({
  value,
  label,
  autoSelect = true,
}: {
  value: string;
  label: string;
  autoSelect?: boolean;
}) {
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoSelect) return;
    input.current?.focus();
    input.current?.select();
  }, [autoSelect]);

  return (
    <div>
      <input
        ref={input}
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={label}
        aria-describedby={hintId}
        className="h-12 w-full rounded-[14px] border border-line bg-card-2 px-3 text-base text-ink outline-none focus:border-gold"
      />
      <p id={hintId} className="mt-1.5 text-xs text-muted">
        자동으로 복사되지 않았어요. 주소를 길게 눌러 복사해 주세요
      </p>
    </div>
  );
}

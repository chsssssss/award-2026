"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { EyeOffIcon } from "@/components/icons";
import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors } from "@/lib/colors";
import { fetchJson } from "@/lib/fetch-json";
import type { ManageAfterReveal, ManageAward, ManageTrophy } from "@/lib/manage-types";
import { MESSAGES_PAGE, reasonText, senderLabel } from "@/lib/reveal";
import { formatKoreanDate } from "@/lib/time";

type Props = { slug: string; token: string; data: ManageAfterReveal };

const appear = "motion-reduce:animate-none";

/** 결과 화면(공개 후). design/Reveal.dc.html 구성. */
export function RevealedBoard({ slug, token, data }: Props) {
  const { awards, trophyCount } = data;
  const [selectedKey, setSelectedKey] = useState(awards[0]?.key ?? "");
  // 서버 응답 위에 이번 화면에서 바꾼 숨김 상태를 겹쳐 쓴다
  const [hiddenOverrides, setHiddenOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const revealLabel = `${formatKoreanDate(new Date(data.revealAt))} 공개`;
  const isHidden = (t: ManageTrophy) => hiddenOverrides[t.id] ?? t.hidden;

  async function setHidden(trophy: ManageTrophy, hidden: boolean) {
    if (pending[trophy.id]) return;
    const before = isHidden(trophy);
    setError(null);
    setPending((p) => ({ ...p, [trophy.id]: true }));
    setHiddenOverrides((o) => ({ ...o, [trophy.id]: hidden }));
    const result = await fetchJson<{ id: string; hidden: boolean }>(`/api/manage/${slug}/trophies/${trophy.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
      cache: "no-store",
    });
    setPending((p) => {
      const next = { ...p };
      delete next[trophy.id];
      return next;
    });
    if (!result.ok) {
      setHiddenOverrides((o) => ({ ...o, [trophy.id]: before }));
      setError(result.message);
    }
  }

  const header = (
    <>
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-gold px-2.5 py-1 text-xs font-bold text-gold">{revealLabel}</span>
        <span className="text-[13px] text-muted">트로피 {trophyCount}개</span>
      </div>
      <h1 className="mt-4 font-display text-[28px] font-extrabold tracking-[-0.4px]">{data.name}의 2026 시상식</h1>
    </>
  );

  if (trophyCount === 0 || awards.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        {header}
        <div className="mt-5 flex flex-col items-center gap-3 rounded-[24px] bg-card px-6 py-10 text-center">
          <TrophyIcon variant="locked" size={72} />
          <p className="mt-2 text-[17px] font-bold">아직 받은 트로피가 없어요</p>
          <p className="text-sm text-muted">내년에는 더 일찍 열어봐요</p>
        </div>
      </div>
    );
  }

  const top = awards[0];
  const selected = awards.find((a) => a.key === selectedKey) ?? top;

  return (
    <div className="flex flex-1 flex-col">
      {header}
      <p className="mt-1.5 text-sm text-muted">친구 {trophyCount}명이 트로피를 보냈어요</p>

      <section aria-label="대상" className="mt-5 flex flex-col items-center rounded-[24px] bg-card p-6 text-center">
        <span className="rounded-full bg-gold px-3.5 py-[5px] text-[13px] font-bold text-on-gold">대상</span>
        <div className="relative flex h-[140px] w-full items-center justify-center">
          <div className={`animate-reveal-rise ${appear}`}>
            <TrophyIcon size={120} />
          </div>
          <Sparkle className="absolute top-[18px] left-[calc(50%-77px)]" size={20} />
          <Sparkle className="absolute top-10 left-[calc(50%+62px)]" size={13} color={colors.goldLight} />
          <Sparkle className="absolute bottom-4 left-[calc(50%+49px)]" size={16} />
        </div>
        <h2 className="font-display text-[26px] font-extrabold tracking-[-0.4px]">{top.name}</h2>
        <p className="mt-1.5 text-sm text-muted">친구 {top.count}명이 이 상을 줬어요</p>
      </section>

      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="text-base font-bold">트로피 진열장</h2>
        <span className="text-[13px] text-muted">
          {awards.length}종 · {trophyCount}개
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2.5">
        {awards.map((award, i) => {
          const isSelected = award.key === selected.key;
          return (
            <li key={award.key} className={`animate-tile-in ${appear}`} style={{ animationDelay: `${250 + i * 70}ms` }}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedKey(award.key)}
                className={`flex h-[116px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-1.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light ${
                  isSelected ? "border-gold bg-[#2A2440]" : "border-transparent bg-card-2"
                }`}
              >
                <TrophyIcon size={32} />
                <span className="text-center text-xs leading-[1.3] font-medium">{award.name}</span>
                <span className="text-[13px] font-bold text-gold">×{award.count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 상을 바꾸면 "더 보기"도 처음부터 */}
      <Messages
        key={selected.key}
        award={selected}
        isHidden={isHidden}
        pending={pending}
        onSetHidden={setHidden}
      />
      <p aria-live="polite" className={error ? "mt-3 text-center text-[13px] text-danger" : "sr-only"}>
        {error}
      </p>

      <div className="min-h-8 flex-1" />

      {/* 결과 스토리 이미지와 다음 작업에서 연결 */}
      <Button disabled>
        <span>스토리로 자랑하기</span>
        <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium">곧 열려요</span>
      </Button>
    </div>
  );
}

function Messages({
  award,
  isHidden,
  pending,
  onSetHidden,
}: {
  award: ManageAward;
  isHidden: (t: ManageTrophy) => boolean;
  pending: Record<string, boolean>;
  onSetHidden: (t: ManageTrophy, hidden: boolean) => void;
}) {
  const [shown, setShown] = useState(MESSAGES_PAGE);
  const visible = award.trophies.slice(0, shown);
  const rest = award.trophies.length - visible.length;

  return (
    <section aria-labelledby={`messages-${award.key}`}>
      <h3 id={`messages-${award.key}`} className="mt-6 text-[15px] font-bold">
        ‘{award.name}’에 남긴 말
      </h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {visible.map((trophy) => {
          const hidden = isHidden(trophy);
          const busy = Boolean(pending[trophy.id]);
          if (hidden) {
            return (
              <li
                key={trophy.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-2"
              >
                <span className="text-[13px] text-subtle">숨긴 메시지</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSetHidden(trophy, false)}
                  className="min-h-11 px-2 text-[13px] font-bold text-gold underline-offset-4 hover:underline disabled:opacity-50"
                >
                  다시 보이기
                </button>
              </li>
            );
          }
          const reason = reasonText(trophy);
          return (
            <li key={trophy.id} className="relative rounded-2xl bg-card-2 py-3.5 pr-12 pl-4">
              <p className="text-[13px] font-bold text-gold">{senderLabel(trophy)}</p>
              <p className={`mt-1 text-[15px] leading-normal ${reason ? "" : "text-subtle"}`}>
                {reason ?? "(남긴 말 없음)"}
              </p>
              <button
                type="button"
                aria-label="메시지 숨기기"
                disabled={busy}
                onClick={() => onSetHidden(trophy, true)}
                className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-gold-light active:bg-card disabled:opacity-50"
              >
                <EyeOffIcon />
              </button>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + MESSAGES_PAGE)}
          className="mt-2.5 min-h-11 w-full text-center text-[13px] text-muted"
        >
          메시지 {rest}개 더 보기
        </button>
      )}
    </section>
  );
}

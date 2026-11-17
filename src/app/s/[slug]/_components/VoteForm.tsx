"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import { Button } from "@/components/Button";
import { CheckCircleIcon, LockIcon, PlusIcon } from "@/components/icons";
import { AWARDS, getAward, type AwardId } from "@/lib/awards";
import { colors } from "@/lib/colors";
import { REASON_MAX } from "@/lib/constants";
import { postJson } from "@/lib/fetch-json";
import { saveGivenAward } from "@/lib/given-award";
import {
  charLength,
  createTrophySchema,
  fieldErrors,
  normalizeText,
} from "@/lib/schemas";
import { gaveKey, readStorage, writeStorage } from "@/lib/storage";

type Props = {
  slug: string;
  name: string;
  /** "12월 31일" */
  revealDateLabel: string;
};

type Pick = AwardId | "custom" | null;
type Field = "awardId" | "customName" | "reason" | "senderName";

const subscribeNothing = () => () => {};

const inputBase =
  "rounded-[14px] border bg-card px-4 text-base text-ink outline-none transition-colors focus:border-gold disabled:bg-card-2 disabled:text-subtle";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function VoteForm({ slug, name, revealDateLabel }: Props) {
  const router = useRouter();
  const ids = {
    title: useId(),
    customName: useId(),
    reason: useId(),
    counter: useId(),
    sender: useId(),
    error: useId(),
  };
  const customInput = useRef<HTMLInputElement>(null);

  // 서버 렌더링 때는 false(폼을 먼저 그림). 브라우저에서 기록이 있으면 안내로 바뀐다.
  const gaveBefore = useSyncExternalStore(
    subscribeNothing,
    () => readStorage(gaveKey(slug)) !== null,
    () => false,
  );

  const [pick, setPick] = useState<Pick>(null);
  const [customName, setCustomName] = useState("");
  const [reason, setReason] = useState("");
  const [senderName, setSenderName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 이번 방문에서 직접 보냈으면(성공·409) 방금 남긴 기록 때문에 "이미 줬어요" 화면으로 바뀌지 않게 한다.
  const [sentHere, setSentHere] = useState(false);
  const showAlreadyGiven = gaveBefore && !sentHere;

  useEffect(() => {
    if (pick === "custom") customInput.current?.focus();
  }, [pick]);

  const clearError = (field: Field) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const reasonLength = charLength(normalizeText(reason));
  const doneUrl = `/s/${slug}/done`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pick || submitting) return;

    const parsed = createTrophySchema.safeParse({
      awardId: pick,
      customName: pick === "custom" ? customName : undefined,
      reason,
      senderName: anonymous ? undefined : senderName,
      anonymous,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const result = await postJson(`/api/ceremonies/${slug}/trophies`, parsed.data);

    if (result.ok) {
      setSentHere(true);
      writeStorage(gaveKey(slug), String(Date.now()));
      const awardName =
        parsed.data.awardId === "custom"
          ? (parsed.data.customName ?? "")
          : (getAward(parsed.data.awardId)?.name ?? "");
      saveGivenAward(slug, { awardName, reason: parsed.data.reason });
      router.push(doneUrl);
      return; // 이동할 때까지 버튼은 비활성
    }

    switch (result.status) {
      case 400:
        if (result.field) setErrors({ [result.field]: result.message });
        else setFormError(result.message);
        setSubmitting(false);
        return;
      case 409:
        setSentHere(true);
        writeStorage(gaveKey(slug), String(Date.now()));
        setFormError("이미 이 시상식에 상을 줬어요");
        setTimeout(() => router.push(doneUrl), 1500);
        return;
      case 404:
      case 410:
        // 종료·삭제됐으면 새로고침해서 서버가 보여주는 화면으로
        window.location.reload();
        return;
      default:
        setFormError(result.message); // 429·500·네트워크 오류
        setSubmitting(false);
    }
  }

  if (showAlreadyGiven) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <CheckCircleIcon size={48} />
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.4px]">
            이미 상을 줬어요
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {revealDateLabel}에 {name}님이 확인해요
          </p>
        </div>
        <Button href="/?ref=vote">나도 시상식 열기</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <h1
        id={ids.title}
        className="mt-4 font-display text-[26px] leading-[1.35] font-extrabold tracking-[-0.4px]"
      >
        {name}에게
        <br />
        어떤 상을 줄까요?
      </h1>
      <p className="mt-1.5 text-sm text-muted">하나만 고를 수 있어요</p>

      <div role="group" aria-labelledby={ids.title} className="mt-[18px] grid grid-cols-2 gap-2.5">
        {AWARDS.map((award) => {
          const selected = pick === award.id;
          return (
            <button
              key={award.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setPick(award.id);
                clearError("awardId");
                clearError("customName");
              }}
              className={`relative flex min-h-[66px] flex-col justify-center gap-[3px] rounded-[14px] border-2 py-2 pr-6 pl-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light ${
                selected ? "border-gold bg-[#2A2440]" : "border-disabled bg-card-2"
              }`}
            >
              <span className="text-[15px] leading-tight font-bold">{award.name}</span>
              <span className="text-xs text-muted">{award.desc}</span>
              {selected && <CheckCircleIcon className="absolute top-[7px] right-[7px]" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={pick === "custom"}
        aria-expanded={pick === "custom"}
        aria-controls={ids.customName}
        onClick={() => {
          setPick("custom");
          clearError("awardId");
        }}
        className={`mt-2.5 flex h-[52px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light ${
          pick === "custom" ? "border-gold bg-[#2A2440] text-ink" : "border-[#4A4366] text-muted"
        }`}
      >
        <PlusIcon color={pick === "custom" ? colors.gold : colors.muted} />
        <span>직접 상 이름 짓기</span>
      </button>
      <FieldError id={`${ids.error}-award`} message={errors.awardId} />

      {pick === "custom" && (
        <div className="mt-3 flex flex-col">
          <label htmlFor={ids.customName} className="text-[13px] font-medium text-muted">
            상 이름 (12자까지)
          </label>
          <input
            ref={customInput}
            id={ids.customName}
            type="text"
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              clearError("customName");
            }}
            placeholder="예) 단톡방 지킴이상"
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={errors.customName ? true : undefined}
            aria-describedby={errors.customName ? `${ids.error}-custom` : undefined}
            className={`mt-2 h-[52px] ${inputBase} ${errors.customName ? "border-danger" : "border-line"}`}
          />
          <FieldError id={`${ids.error}-custom`} message={errors.customName} />
        </div>
      )}

      <label htmlFor={ids.reason} className="mt-6 text-[13px] font-medium text-muted">
        시상 사유 한 줄
      </label>
      <div className="relative mt-2">
        <textarea
          id={ids.reason}
          rows={2}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            clearError("reason");
          }}
          placeholder="예) 단톡방을 살린 일등공신"
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={`${ids.counter}${errors.reason ? ` ${ids.error}-reason` : ""}`}
          className={`block w-full resize-none pt-3.5 pb-7 leading-normal ${inputBase} ${
            errors.reason ? "border-danger" : "border-line"
          }`}
        />
        <span
          id={ids.counter}
          className={`pointer-events-none absolute right-4 bottom-2.5 text-xs ${
            reasonLength > REASON_MAX ? "text-danger" : "text-subtle"
          }`}
        >
          {reasonLength}/{REASON_MAX}
        </span>
      </div>
      <FieldError id={`${ids.error}-reason`} message={errors.reason} />

      <label htmlFor={ids.sender} className="mt-5 text-[13px] font-medium text-muted">
        보내는 사람
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={ids.sender}
          type="text"
          value={anonymous ? "" : senderName}
          onChange={(e) => {
            setSenderName(e.target.value);
            clearError("senderName");
          }}
          disabled={anonymous}
          placeholder={anonymous ? "익명으로 보내요" : "닉네임"}
          autoComplete="nickname"
          aria-invalid={errors.senderName ? true : undefined}
          aria-describedby={errors.senderName ? `${ids.error}-sender` : undefined}
          className={`h-[52px] min-w-0 flex-1 ${inputBase} ${
            errors.senderName ? "border-danger" : "border-line"
          }`}
        />
        <button
          type="button"
          aria-pressed={anonymous}
          onClick={() => {
            setAnonymous((value) => !value);
            clearError("senderName");
          }}
          className={`h-[52px] w-24 shrink-0 rounded-[14px] border-[1.5px] text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light ${
            anonymous ? "border-gold bg-gold text-on-gold" : "border-line text-muted"
          }`}
        >
          익명으로
        </button>
      </div>
      <FieldError id={`${ids.error}-sender`} message={errors.senderName} />

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <LockIcon />
        <span>
          어떤 상인지는 {revealDateLabel}에 {name}님에게 공개돼요
        </span>
      </p>

      {/* 하단 버튼은 고정하지 않고 문서 흐름 안에 둔다(키보드가 올라와도 가려지지 않게) */}
      <div className="min-h-8 flex-1" />

      <p aria-live="polite" className={formError ? "mb-3 text-center text-[13px] text-danger" : "sr-only"}>
        {formError}
      </p>
      <Button type="submit" disabled={!pick || submitting}>
        {!pick ? "상을 하나 골라주세요" : submitting ? "수여하는 중…" : "트로피 수여하기"}
      </Button>

      <div className="mt-3 flex justify-center">
        <Link
          href="/?ref=vote"
          className="inline-flex min-h-11 items-center px-3 text-[13px] text-subtle underline underline-offset-4"
        >
          나도 시상식 열기
        </Link>
      </div>
    </form>
  );
}

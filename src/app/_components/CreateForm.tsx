"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { ConsentNote } from "@/components/LegalLinks";
import { refFromSearch } from "@/lib/analytics-url";
import { postJson } from "@/lib/fetch-json";
import { createCeremonySchema } from "@/lib/schemas";
import { track } from "@/lib/track";

type CreateResponse = { slug: string; manageUrl: string };

/** ?ref= 값. 분석용으로 보관만 한다(영문·숫자·_- 64자까지). */
export function CreateForm() {
  const inputId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refParam = useRef("direct");

  useEffect(() => {
    refParam.current = refFromSearch(window.location.search); // ?ref= 유입 경로(없으면 direct)
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createCeremonySchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "이름을 확인해주세요");
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await postJson<CreateResponse>("/api/ceremonies", parsed.data);
    if (result.ok) {
      // 페이지를 떠나도 전송되도록 beacon으로 보내고, 분석 도구를 기다리는 건 최대 0.5초
      await Promise.race([
        track("ceremony_created", { ref: refParam.current }, { beacon: true }),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      // 버튼은 비활성 상태로 둔 채 관리 페이지로 이동한다(중복 생성 방지).
      window.location.assign(result.data.manageUrl);
      return;
    }
    setError(result.message);
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <label htmlFor={inputId} className="text-[13px] font-medium text-muted">
        시상식 주인공 이름
      </label>
      <input
        id={inputId}
        name="name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(null);
        }}
        placeholder="닉네임 (최대 8자)"
        autoComplete="nickname"
        enterKeyHint="go"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-2 h-[52px] rounded-[14px] border bg-card px-4 text-base text-ink outline-none transition-colors focus:border-gold ${
          error ? "border-danger" : "border-line"
        }`}
      />
      <p
        id={errorId}
        aria-live="polite"
        className={`text-[13px] text-danger ${error ? "mt-2" : "sr-only"}`}
      >
        {error}
      </p>
      <Button type="submit" disabled={submitting} className="mt-3">
        {submitting ? "여는 중…" : "내 시상식 열기"}
      </Button>
      <ConsentNote className="mt-2" />
      <p className="mt-2 text-center text-[13px] text-subtle">
        가입 없이 10초면 끝나요
      </p>
    </form>
  );
}

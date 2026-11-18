import Link from "next/link";
import type { ReactNode } from "react";

const linkClass =
  "inline-flex min-h-11 items-center px-2 text-xs text-subtle underline-offset-4 hover:underline";

/** 화면 맨 아래 작은 글씨 "개인정보처리방침 · 이용약관". extra(예: 신고하기)는 뒤에 붙인다. */
export function LegalLinks({ extra, className = "" }: { extra?: ReactNode; className?: string }) {
  return (
    <nav aria-label="약관과 정책" className={`flex flex-wrap items-center justify-center ${className}`}>
      <Link href="/privacy" className={linkClass}>
        개인정보처리방침
      </Link>
      <span aria-hidden="true" className="text-xs text-subtle">
        ·
      </span>
      <Link href="/terms" className={linkClass}>
        이용약관
      </Link>
      {extra && (
        <>
          <span aria-hidden="true" className="text-xs text-subtle">
            ·
          </span>
          {extra}
        </>
      )}
    </nav>
  );
}

/** 만들기·상 주기 버튼 바로 아래 12px 안내. */
export function ConsentNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-subtle ${className}`}>
      버튼을 누르면 이용약관과 개인정보처리방침에 동의하는 것으로 봐요
    </p>
  );
}

export const legalLinkClass = linkClass;

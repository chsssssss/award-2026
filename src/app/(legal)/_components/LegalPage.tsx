import Link from "next/link";
import type { ReactNode } from "react";

// 법적 페이지 공통 틀. 내용은 법률 검토 전 초안이며, 확인이 필요한 곳은 [대괄호]로 남겨 두었다.

export function contactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "[문의 이메일]";
}

export function ContactLink() {
  const email = contactEmail();
  if (email.startsWith("[")) return <>{email}</>;
  return (
    <a href={`mailto:${email}`} className="text-gold underline underline-offset-4">
      {email}
    </a>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col pt-4 pb-10">
      <Link
        href="/"
        className="-ml-2 inline-flex min-h-11 w-fit items-center px-2 text-sm text-muted underline-offset-4 hover:underline"
      >
        처음으로
      </Link>
      <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-0.4px]">{title}</h1>
      <p className="mt-2 text-[13px] text-subtle">시행일: [날짜]</p>
      <p className="mt-5 text-[15px] leading-[1.7] text-muted">{intro}</p>
      <div className="mt-2 flex flex-col">{children}</div>
    </main>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-bold">
        {n}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[1.7] text-ink/90">{children}</div>
    </section>
  );
}

export function List({ items, ordered = false }: { items: ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`flex flex-col gap-2 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-subtle`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}

/** 확인이 필요한 부분 표시 */
export function Todo({ children }: { children: ReactNode }) {
  return <span className="rounded bg-card-2 px-1 text-gold-light">{children}</span>;
}

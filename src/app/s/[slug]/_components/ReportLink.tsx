import { legalLinkClass } from "@/components/LegalLinks";

/** 신고 메일 주소(mailto). 연락처 메일이 설정되지 않았으면 null. */
export function reportMailto(slug: string): string | null {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!email) return null;
  const subject = encodeURIComponent(`[신고] ${slug}`);
  const body = encodeURIComponent("신고 사유를 적어주세요");
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/** 친구 화면 맨 아래 작은 "신고하기" 링크(LegalLinks 뒤에 붙는다). */
export function ReportLink({ href }: { href: string }) {
  return (
    <a href={href} className={legalLinkClass}>
      신고하기
    </a>
  );
}

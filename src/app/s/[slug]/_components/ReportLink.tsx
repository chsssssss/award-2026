/** 친구 화면 맨 아래 작은 "신고하기" 링크. 연락처 메일이 설정되지 않았으면 보이지 않는다. */
export function ReportLink({ slug }: { slug: string }) {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!email) return null;

  const subject = encodeURIComponent(`[신고] ${slug}`);
  const body = encodeURIComponent("신고 사유를 적어주세요");
  return (
    <div className="mt-1 flex justify-center">
      <a
        href={`mailto:${email}?subject=${subject}&body=${body}`}
        className="inline-flex min-h-11 items-center px-3 text-xs text-subtle underline underline-offset-4"
      >
        신고하기
      </a>
    </div>
  );
}

// 사이트 공통 정보. 메타데이터(제목·설명·링크 미리보기)에서 쓴다.

export const SITE_NAME = "올해의 나 시상식";
export const SITE_DESCRIPTION = "친구들이 나에게 상을 줘요. 12월 31일에 공개!";

/** 링크 미리보기(og:image 등) 절대 주소의 기준. 프로덕션은 NEXT_PUBLIC_SITE_URL. */
export function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);
  // Preview 배포에는 NEXT_PUBLIC_SITE_URL이 없어서 Vercel이 주는 배포 주소를 쓴다.
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return new URL(`https://${vercelUrl}`);
  return new URL("http://localhost:3000");
}

/** 페이지마다 openGraph를 새로 쓰면 상위 값이 통째로 바뀌므로 공통 값을 펼쳐 쓴다. */
export const baseOpenGraph = {
  type: "website",
  locale: "ko_KR",
  siteName: SITE_NAME,
} as const;

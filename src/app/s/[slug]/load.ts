import "server-only";

import type { Metadata } from "next";
import { connection } from "next/server";
import { cache } from "react";

import { getPublicCeremony } from "@/lib/ceremonies";
import { baseOpenGraph } from "@/lib/site";
import { formatKoreanDate } from "@/lib/time";

/**
 * 친구 화면에서 쓰는 시상식 공개 정보(트로피 내용 없음).
 * 같은 요청 안의 generateMetadata와 페이지가 한 번만 읽도록 cache로 묶는다.
 * connection()으로 요청 시점 렌더링을 먼저 알린 뒤 서버의 현재 시각으로 종료 여부를 판단한다.
 */
export const loadCeremony = cache(async (slug: string) => {
  await connection();
  return getPublicCeremony(slug);
});

/** /s/[slug]와 하위 화면의 메타데이터. 링크 미리보기(카톡·인스타 DM)에 그대로 쓰인다. */
export async function ceremonyMetadata(params: Promise<{ slug: string }>): Promise<Metadata> {
  const { slug } = await params;
  const ceremony = await loadCeremony(slug);

  let title = "시상식을 찾을 수 없어요";
  let description = "링크가 맞는지 한 번 더 확인해 주세요.";
  if (ceremony) {
    title = `${ceremony.name}님의 2026 시상식`;
    description = ceremony.closed
      ? `${ceremony.name}님의 시상식이 끝났어요. 내년에 또 만나요.`
      : `${ceremony.name}님에게 어울리는 상을 골라주세요. ${formatKoreanDate(ceremony.revealAt)}에 공개돼요.`;
  }

  return {
    title,
    description,
    // 이미지는 같은 폴더의 opengraph-image.tsx가 채운다.
    openGraph: { ...baseOpenGraph, title, description, url: `/s/${slug}` },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

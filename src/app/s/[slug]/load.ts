import "server-only";

import type { Metadata } from "next";
import { connection } from "next/server";
import { cache } from "react";

import { getPublicCeremony } from "@/lib/ceremonies";

/**
 * 한 요청 안에서 generateMetadata와 페이지가 같은 결과를 쓰도록 묶는다(Firestore 읽기 1번).
 * 반환값에는 트로피 내용이 없다(이름·공개 시각·개수·종료 여부만).
 */
export const loadCeremony = cache(async (slug: string) => {
  // 공개 여부(closed)를 요청 시점의 서버 시각으로 계산하므로, 시각을 읽기 전에 요청 시점 렌더링으로 표시한다.
  await connection();
  return getPublicCeremony(slug);
});

export async function ceremonyMetadata(
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  const ceremony = await loadCeremony(slug);
  return {
    title: ceremony ? `${ceremony.name}님의 2026 시상식` : "시상식을 찾을 수 없어요",
    // 친구 이름이 들어간 페이지라 검색엔진에는 노출하지 않는다
    robots: { index: false, follow: false },
  };
}

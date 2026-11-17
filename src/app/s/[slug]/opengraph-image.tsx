import { connection } from "next/server";

import { renderCeremonyImage, renderDefaultImage } from "@/lib/og-image";
import { isValidSlug } from "@/lib/slug";

import { loadCeremony } from "./load";

// Node 런타임(기본값). Cache Components를 켜면 edge 런타임은 쓸 수 없다.
export const alt = "2026 시상식 초대 이미지";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection(); // 요청 시점에 만든다(시상식 이름·종료 여부)
  const { slug } = await params;
  const ceremony = isValidSlug(slug) ? await loadCeremony(slug) : null;
  // 없거나 끝난 시상식은 "상을 골라줘" 대신 사이트 기본 이미지
  if (!ceremony || ceremony.closed) return renderDefaultImage();
  return renderCeremonyImage(ceremony.name);
}

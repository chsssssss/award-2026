import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ImageResponse } from "next/og";

// 링크 미리보기 이미지(next/og)에 넣는 한글 폰트. scripts/subset-fonts.py로 만든 서브셋(.ttf)이다.
// Vercel 배포에서 파일이 빠지지 않도록 next.config의 outputFileTracingIncludes에 assets/fonts를 넣어 두었다.

type OgFonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const FONT_FILES = [
  { name: "Myeongjo", file: "Myeongjo-ExtraBold.ttf", weight: 800 },
  { name: "NotoSansKR", file: "NotoSansKR-Regular.ttf", weight: 400 },
  { name: "NotoSansKR", file: "NotoSansKR-Bold.ttf", weight: 700 },
] as const;

let fontsPromise: Promise<OgFonts> | null = null;

async function loadFonts(): Promise<OgFonts> {
  return Promise.all(
    FONT_FILES.map(async ({ name, file, weight }) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(path.join(process.cwd(), "assets/fonts", file)),
    })),
  );
}

/** ImageResponse의 fonts 옵션. 한 번 읽은 파일은 모듈 수준에서 재사용한다. */
export function getOgFonts(): Promise<OgFonts> {
  fontsPromise ??= loadFonts().catch((error: unknown) => {
    fontsPromise = null; // 실패는 캐시하지 않고 다음 요청에서 다시 읽는다
    throw error;
  });
  return fontsPromise;
}

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ImageResponse } from "next/og";

// 이미지(next/og)에 넣는 한글 폰트. scripts/subset-fonts.py로 만든 서브셋(.ttf)이다.
// Vercel 배포에서 파일이 빠지지 않도록 next.config의 outputFileTracingIncludes에 assets/fonts를 넣어 두었다.

type OgFonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const FONT_FILES = [
  { name: "Myeongjo", file: "Myeongjo-ExtraBold.ttf", weight: 800 },
  { name: "NotoSansKR", file: "NotoSansKR-Regular.ttf", weight: 400 },
  { name: "NotoSansKR", file: "NotoSansKR-Bold.ttf", weight: 700 },
] as const;

/** 2,350자에 없는 나머지 한글 음절(8,822자)만 담은 보조 명조. 필요할 때만 읽는다. */
const EXT_FONT_FILE = { name: "MyeongjoExt", file: "Myeongjo-ExtraBold-Ext.ttf", weight: 800 } as const;

async function loadFont({ name, file, weight }: { name: string; file: string; weight: 400 | 700 | 800 }) {
  return {
    name,
    weight,
    style: "normal" as const,
    data: await readFile(path.join(process.cwd(), "assets/fonts", file)),
  };
}

/** 실패한 읽기는 캐시하지 않는 모듈 수준 Promise 캐시. */
function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((error: unknown) => {
      promise = null;
      throw error;
    });
    return promise;
  };
}

const loadBaseFonts = cached((): Promise<OgFonts> => Promise.all(FONT_FILES.map(loadFont)));
const loadExtFont = cached(() => loadFont(EXT_FONT_FILE));

let ksHangul: Set<string> | null = null;

/** KS X 1001 완성형 한글 2,350자(서브셋에 들어 있는 글자). EUC-KR 0xB0A1~0xC8FE를 디코딩해 만든다. */
function ksXHangul(): Set<string> {
  if (ksHangul) return ksHangul;
  const decoder = new TextDecoder("euc-kr");
  const set = new Set<string>();
  for (let lead = 0xb0; lead <= 0xc8; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      set.add(decoder.decode(new Uint8Array([lead, trail])));
    }
  }
  ksHangul = set;
  return set;
}

/** 2,350자에 없는 한글 음절(예: 똠)이 들어 있는지. */
export function needsExtendedHangul(text: string): boolean {
  const ks = ksXHangul();
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0xac00 && cp <= 0xd7a3 && !ks.has(ch)) return true;
  }
  return false;
}

/**
 * ImageResponse의 fonts 옵션. 한 번 읽은 파일은 모듈 수준에서 재사용한다.
 * text(그릴 이름 등)에 2,350자 밖의 한글이 있으면 보조 명조를 덧붙여, 외부에서 글꼴을 받지 않고도 명조로 그린다.
 */
export async function getOgFonts(text = ""): Promise<OgFonts> {
  const base = await loadBaseFonts();
  return needsExtendedHangul(text) ? [...base, await loadExtFont()] : base;
}

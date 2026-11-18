import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

// 욕설 필터. data/badwords.txt(금지 단어)와 data/allowwords.txt(예외 단어)를 읽는다.
// 두 파일은 next.config의 outputFileTracingIncludes로 Vercel 배포에 포함된다.

/** 보이지 않는 한글 채움 문자(글자로 분류되지만 화면에 안 보인다) */
const HANGUL_FILLERS = /[ᅟᅠㅤﾠ]/g;

/**
 * 비교용 정규화: NFC → 소문자 → 글자(\p{L})만 남김(공백·문장부호·숫자·이모지·보이지 않는 문자 제거)
 * → 같은 글자 3번 이상 반복은 2번으로. 한글 초성(ㄱ~ㅎ)은 글자라서 남는다.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}]/gu, "")
    .replace(HANGUL_FILLERS, "")
    .replace(/(.)\1{2,}/gu, "$1$1");
}

/** 한 줄에 한 단어. #부터 줄 끝은 주석, 빈 줄은 건너뛴다. */
export function parseWordList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean);
}

export type ProfanityFilter = { containsProfanity(text: string): boolean };

/** 단어 목록으로 필터를 만든다(테스트에서는 가짜 목록을 넣는다). */
export function createProfanityFilter(lists: {
  badWords: readonly string[];
  allowWords: readonly string[];
}): ProfanityFilter {
  const bad = [...new Set(lists.badWords.map(normalize).filter(Boolean))];
  // 긴 예외 단어부터 지워야 짧은 예외 단어가 긴 것의 일부만 지우지 않는다
  const allow = [...new Set(lists.allowWords.map(normalize).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );

  return {
    containsProfanity(text) {
      let normalized = normalize(text);
      if (!normalized) return false;
      // 예외 단어 부분을 먼저 지운다. 앞뒤 글자가 붙어 새 단어가 되지 않게 빈칸으로 바꾼다.
      for (const word of allow) normalized = normalized.split(word).join(" ");
      return bad.some((word) => normalized.includes(word));
    },
  };
}

function readList(file: string, optional: boolean): string[] {
  try {
    return parseWordList(readFileSync(path.join(process.cwd(), "data", file), "utf8"));
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

let defaultFilter: ProfanityFilter | null = null;

/** data/의 목록으로 검사한다. 처음 부를 때 읽어 정규화한 뒤 캐시한다. */
export function containsProfanity(text: string): boolean {
  defaultFilter ??= createProfanityFilter({
    badWords: readList("badwords.txt", false),
    allowWords: readList("allowwords.txt", true),
  });
  return defaultFilter.containsProfanity(text);
}

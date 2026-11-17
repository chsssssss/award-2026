// 링크 미리보기 제목의 글자 크기 계산. next/og는 글자를 자동으로 줄여 주지 않아서
// 글자 폭을 어림해 한 줄에 들어가는 크기를 고른다.

// assets/fonts/Myeongjo-ExtraBold.ttf의 hmtx에서 잰 ASCII(U+0020~U+007E) 글자 폭, 1/1000em.
// 폰트를 바꾸면 이 표도 다시 재야 한다(og-text.test.ts가 실제 폰트 파일과 비교한다).
const ASCII_WIDTHS = [
  273, 370, 320, 617, 617, 862, 858, 176, 365, 365, 639, 639, 273, 639, 273, 434,
  537, 537, 537, 537, 537, 537, 537, 537, 537, 537, 410, 410, 548, 639, 548, 524,
  854, 727, 612, 728, 787, 612, 555, 787, 846, 319, 378, 728, 612, 1020, 845, 845,
  554, 845, 728, 508, 669, 728, 729, 1020, 787, 728, 728, 365, 434, 365, 502, 502,
  288, 503, 562, 464, 562, 444, 328, 503, 562, 270, 270, 562, 270, 844, 562, 562,
  562, 562, 386, 386, 328, 562, 503, 795, 562, 503, 444, 365, 252, 365, 720,
];
const HANGUL_WIDTH = 950; // 한글 음절·자모는 모두 같은 폭
const OTHER_WIDTH = 1000; // 그 밖의 글자(이모지 등)는 넉넉하게 1em

/** 명조 제목 글꼴로 그렸을 때의 폭(em 단위). */
export function titleWidthEm(text: string): number {
  let total = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x20 && cp <= 0x7e) total += ASCII_WIDTHS[cp - 0x20];
    else if ((cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x3131 && cp <= 0x318e)) total += HANGUL_WIDTH;
    else total += OTHER_WIDTH;
  }
  return total / 1000;
}

/** 모든 줄이 maxWidth(px) 안에 한 줄로 들어가는 가장 큰 글자 크기(px). */
export function fitFontSize(
  lines: readonly string[],
  maxWidth: number,
  { max, min }: { max: number; min: number },
): number {
  const widest = Math.max(...lines.map(titleWidthEm), 0.001);
  return Math.max(min, Math.min(max, Math.floor(maxWidth / widest)));
}

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fitFontSize, titleWidthEm } from "./og-text";

const BOX = { max: 72, min: 40 };
const WIDTH = 588; // og-image.tsx의 글자 영역 폭

/** TrueType hmtx/cmap(format 4)만 읽어 글자 폭을 잰다(테스트용 최소 파서). */
function readAdvanceWidths(file: string) {
  const buf = readFileSync(file);
  const tables = new Map<string, number>();
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables.set(buf.toString("latin1", rec, rec + 4), buf.readUInt32BE(rec + 8));
  }
  const head = tables.get("head")!;
  const hhea = tables.get("hhea")!;
  const hmtx = tables.get("hmtx")!;
  const cmap = tables.get("cmap")!;
  const upm = buf.readUInt16BE(head + 18);
  const numHMetrics = buf.readUInt16BE(hhea + 34);

  let sub = -1;
  for (let i = 0; i < buf.readUInt16BE(cmap + 2); i++) {
    const rec = cmap + 4 + i * 8;
    const offset = cmap + buf.readUInt32BE(rec + 4);
    if (buf.readUInt16BE(offset) === 4) sub = offset;
  }
  const segX2 = buf.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const rangeOffsets = deltas + segX2;
  const glyphOf = (cp: number) => {
    for (let s = 0; s < segX2; s += 2) {
      if (cp > buf.readUInt16BE(ends + s)) continue;
      if (cp < buf.readUInt16BE(starts + s)) return 0;
      const ro = buf.readUInt16BE(rangeOffsets + s);
      const delta = buf.readInt16BE(deltas + s);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = buf.readUInt16BE(rangeOffsets + s + ro + (cp - buf.readUInt16BE(starts + s)) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
  return (ch: string) => {
    const glyph = Math.min(glyphOf(ch.codePointAt(0)!), numHMetrics - 1);
    return Math.round((buf.readUInt16BE(hmtx + glyph * 4) * 1000) / upm);
  };
}

describe("titleWidthEm", () => {
  it("표의 글자 폭이 실제 명조 폰트 파일과 같다", () => {
    const advance = readAdvanceWidths(path.join(process.cwd(), "assets/fonts/Myeongjo-ExtraBold.ttf"));
    for (let cp = 0x20; cp <= 0x7e; cp++) {
      const ch = String.fromCodePoint(cp);
      expect(titleWidthEm(ch) * 1000, ch).toBe(advance(ch));
    }
    for (const ch of ["가", "님", "의", "힝", "ㄱ"]) {
      expect(titleWidthEm(ch) * 1000, ch).toBe(advance(ch));
    }
  });

  it("한글·영문·기타 글자를 더한다", () => {
    expect(titleWidthEm("지민님의")).toBeCloseTo(3.8);
    expect(titleWidthEm("2026 시상식")).toBeCloseTo(2.148 + 0.273 + 2.85);
    expect(titleWidthEm("🏆")).toBe(1);
    expect(titleWidthEm("")).toBe(0);
  });
});

describe("fitFontSize", () => {
  it("짧은 이름은 최대 크기 그대로", () => {
    expect(fitFontSize(["지민님의", "2026 시상식"], WIDTH, BOX)).toBe(72);
    expect(fitFontSize(["Victoria님의", "2026 시상식"], WIDTH, BOX)).toBe(72);
  });

  it("긴 이름은 한 줄에 들어가게 줄인다", () => {
    const lines = ["김수한무거북이와님의", "2026 시상식"];
    const size = fitFontSize(lines, WIDTH, BOX);
    expect(size).toBe(61); // 9.5em → 588 / 9.5 = 61.9
    expect(titleWidthEm(lines[0]) * size).toBeLessThanOrEqual(WIDTH);
  });

  it("아무리 길어도 최소 크기 아래로는 줄이지 않는다", () => {
    expect(fitFontSize(["가".repeat(40)], WIDTH, BOX)).toBe(40);
  });

  it("기본 이미지 제목도 한 줄에 들어간다", () => {
    const size = fitFontSize(["올해 나는", "무슨 상을 받을까?"], WIDTH, BOX);
    expect(titleWidthEm("무슨 상을 받을까?") * size).toBeLessThanOrEqual(WIDTH);
  });
});

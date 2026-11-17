/**
 * 디자인 색 토큰(CLAUDE.md 기준).
 * Tailwind 클래스는 globals.css의 @theme에서 같은 값을 쓴다(bg-bg, text-ink ...).
 * 이 객체는 CSS 클래스를 쓸 수 없는 곳(SVG 속성, next/og 이미지)에서 쓴다.
 * 두 곳의 값이 같은지는 colors.test.ts가 확인한다.
 */
export const colors = {
  bg: "#15131F",
  card: "#221D33",
  card2: "#1D1A2B",
  line: "#3A3452",
  disabled: "#2C2740",
  locked: "#3B3555",
  ink: "#F6F1E7",
  muted: "#ABA5BF",
  subtle: "#948EAD",
  danger: "#FF8A7A",
  gold: "#E8B84A",
  goldDark: "#C9962E",
  goldLight: "#F7DE9C",
  onGold: "#1A1526",
} as const;

export type ColorToken = keyof typeof colors;

/** colors 키를 Tailwind 토큰 이름으로: card2 → "card-2", goldDark → "gold-dark". */
export function colorTokenName(key: ColorToken): string {
  return key
    .replace(/([A-Z])/g, "-$1")
    .replace(/(\d+)/g, "-$1")
    .toLowerCase();
}

/** [토큰 이름, 값] 목록(dev 견본, 테스트용). */
export const colorTokens = (Object.keys(colors) as ColorToken[]).map((key) => ({
  name: colorTokenName(key),
  hex: colors[key],
}));

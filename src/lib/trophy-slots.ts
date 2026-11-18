// 내 시상식 화면(공개 전)의 "도착한 트로피" 칸 계산. 4열 그리드, 최대 12칸.

export const MAX_VISIBLE_TROPHIES = 11;
const EMPTY_GRID = 4;

export type TrophySlot =
  | { kind: "locked" }
  /** 다음 트로피가 들어올 점선 빈칸 */
  | { kind: "empty" }
  /** 11개를 넘으면 마지막 칸에 "+N" */
  | { kind: "more"; count: number };

/**
 * 0개: 빈칸 4개. 1~11개: 잠긴 트로피 N개 + 빈칸 1개.
 * 12개 이상: 잠긴 트로피 11개 + "+(N-11)".
 */
export function trophySlots(count: number): TrophySlot[] {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n === 0) return Array.from({ length: EMPTY_GRID }, () => ({ kind: "empty" }) as const);

  const locked = Math.min(n, MAX_VISIBLE_TROPHIES);
  const slots: TrophySlot[] = Array.from({ length: locked }, () => ({ kind: "locked" }) as const);
  slots.push(n > MAX_VISIBLE_TROPHIES ? { kind: "more", count: n - MAX_VISIBLE_TROPHIES } : { kind: "empty" });
  return slots;
}

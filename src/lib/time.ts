// 시각 계산. 서버에서는 항상 서버의 현재 시각(now 기본값)으로 판단한다.
// 한국은 서머타임이 없어서 UTC+9를 고정으로 쓴다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC 기준 Date를 한국 시간 벽시계 값으로 옮긴 Date(getUTC*로 읽는다). */
function toKstWallClock(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/** 한국 날짜 기준 일련번호(같은 날이면 같은 값). */
function kstDayNumber(date: Date): number {
  return Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);
}

/** 공개 시각이 됐는지. revealAt과 같은 순간부터 공개로 본다. */
export function isRevealed(revealAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= revealAt.getTime();
}

/**
 * 한국 날짜 기준 D-day 숫자. 공개 당일은 0, 전날은 1.
 * 공개일이 지났으면 음수가 나온다.
 */
export function daysUntil(revealAt: Date, now: Date = new Date()): number {
  return kstDayNumber(revealAt) - kstDayNumber(now);
}

/** 한국 시간 기준 "12월 31일". */
export function formatKoreanDate(date: Date): string {
  const kst = toKstWallClock(date);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

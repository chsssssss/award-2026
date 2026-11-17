// 공개일 캘린더 추가: Google 캘린더 링크와 .ics(아이폰 캘린더 등) 파일 내용.

export const REVEAL_EVENT_TITLE = "내 2026 시상식 결과 공개";
const EVENT_DURATION_MS = 60 * 60 * 1000;

/** 20261231T120000Z 형식(UTC). */
export function toCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function googleCalendarUrl(revealAt: Date, manageUrl: string): string {
  const start = toCalendarUtc(revealAt);
  const end = toCalendarUtc(new Date(revealAt.getTime() + EVENT_DURATION_MS));
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(REVEAL_EVENT_TITLE)}` +
    `&dates=${start}/${end}` +
    `&details=${encodeURIComponent(`결과 보기: ${manageUrl}`)}`
  );
}

/** RFC 5545 TEXT 값 이스케이프. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** 한 줄을 75옥텟(UTF-8) 이하로 접는다. 멀티바이트 글자는 중간에서 자르지 않는다. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // 이어지는 줄은 앞에 공백 1옥텟이 붙는다
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildRevealIcs(opts: {
  slug: string;
  revealAt: Date;
  manageUrl: string;
  now?: Date;
}): string {
  const { slug, revealAt, manageUrl, now = new Date() } = opts;
  const end = new Date(revealAt.getTime() + EVENT_DURATION_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//award-2026//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${slug}-reveal@award-2026`,
    `DTSTAMP:${toCalendarUtc(now)}`,
    `DTSTART:${toCalendarUtc(revealAt)}`,
    `DTEND:${toCalendarUtc(end)}`,
    `SUMMARY:${escapeText(REVEAL_EVENT_TITLE)}`,
    `DESCRIPTION:${escapeText(`결과 보기: ${manageUrl}`)}`,
    `URL:${manageUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT1H",
    `DESCRIPTION:${escapeText(`${REVEAL_EVENT_TITLE} 1시간 전이에요`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

import { describe, expect, it } from "vitest";

import {
  buildRevealIcs,
  foldLine,
  googleCalendarUrl,
  toCalendarUtc,
} from "./calendar";
import { REVEAL_AT } from "./constants";

const LINK = "https://award.example/m/ab3defgh#TestToken_TestToken_TestToken_32";

describe("toCalendarUtc", () => {
  it("UTC 기본 형식으로 바꿔요", () => {
    expect(toCalendarUtc(REVEAL_AT)).toBe("20261231T120000Z");
  });
});

describe("googleCalendarUrl", () => {
  it("제목·시간·설명을 넣고 인코딩해요", () => {
    const url = googleCalendarUrl(REVEAL_AT, LINK);
    expect(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE")).toBe(
      true,
    );
    expect(url).toContain("&dates=20261231T120000Z/20261231T130000Z");
    const params = new URL(url).searchParams;
    expect(params.get("text")).toBe("내 2026 시상식 결과 공개");
    expect(params.get("details")).toBe(`결과 보기: ${LINK}`);
    // '#'이 인코딩되지 않으면 토큰이 URL 조각으로 잘려 나간다
    expect(url).not.toContain("#");
  });
});

describe("buildRevealIcs", () => {
  const ics = buildRevealIcs({
    slug: "ab3defgh",
    revealAt: REVEAL_AT,
    manageUrl: LINK,
    now: new Date("2026-11-17T11:00:00Z"),
  });
  const unfolded = ics.replace(/\r\n /g, "");

  it("CRLF 줄바꿈과 VEVENT·VALARM 구조", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
    expect(unfolded).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(unfolded).toContain("DTSTART:20261231T120000Z\r\nDTEND:20261231T130000Z");
    expect(unfolded).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT1H");
    expect(unfolded).toContain("UID:ab3defgh-reveal@award-2026");
    expect(unfolded).toContain("DTSTAMP:20261117T110000Z");
  });

  it("DESCRIPTION과 URL에 관리 링크가 들어가요", () => {
    expect(unfolded).toContain(`DESCRIPTION:결과 보기: ${LINK}`);
    expect(unfolded).toContain(`URL:${LINK}`);
    expect(unfolded).toContain("SUMMARY:내 2026 시상식 결과 공개");
  });

  it("모든 줄이 75옥텟 이하", () => {
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("foldLine", () => {
  it("한글을 중간에서 자르지 않고 이어지는 줄은 공백으로 시작해요", () => {
    const line = "DESCRIPTION:" + "가".repeat(40); // 12 + 120 옥텟
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("짧은 줄은 그대로", () => {
    expect(foldLine("VERSION:2.0")).toBe("VERSION:2.0");
  });
});

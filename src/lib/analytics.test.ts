import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refFromSearch, sanitizeProperties, sanitizeUrl } from "./analytics-url";

const TOKEN = "TestToken_TestToken_TestToken_32";

describe("sanitizeUrl", () => {
  it("관리 링크의 # 뒤(토큰)를 지워요", () => {
    expect(sanitizeUrl(`https://a.example/m/ab3defgh#${TOKEN}`)).toBe("https://a.example/m/ab3defgh");
  });

  it("쿼리는 형식이 맞는 ref만 남겨요", () => {
    expect(sanitizeUrl("https://a.example/?ref=vote&name=지민&token=x#y")).toBe("https://a.example/?ref=vote");
    expect(sanitizeUrl("https://a.example/s/ab3defgh?utm_source=insta")).toBe("https://a.example/s/ab3defgh");
    expect(sanitizeUrl("https://a.example/?ref=<script>")).toBe("https://a.example/");
  });

  it("URL이 아니면 # 와 ? 뒤를 잘라요", () => {
    expect(sanitizeUrl(`/m/ab3defgh?x=1#${TOKEN}`)).toBe("/m/ab3defgh");
  });
});

describe("sanitizeProperties", () => {
  it("http(s) 주소 값은 모두 정리하고 나머지는 그대로", () => {
    const out = sanitizeProperties({
      $current_url: `https://a.example/m/ab3defgh#${TOKEN}`,
      $referrer: "https://l.instagram.com/?u=https%3A%2F%2Fa.example&e=abc",
      $initial_current_url: `https://a.example/m/ab3defgh?ref=x#${TOKEN}`,
      $referring_domain: "l.instagram.com",
      slug: "ab3defgh",
      count: 3,
      title: "지민님의 2026 시상식", // 문서 제목에 이름이 들어 있다
      $title: "지민님의 2026 시상식",
    });
    expect(out).toEqual({
      $current_url: "https://a.example/m/ab3defgh",
      $referrer: "https://l.instagram.com/",
      $initial_current_url: "https://a.example/m/ab3defgh?ref=x",
      $referring_domain: "l.instagram.com",
      slug: "ab3defgh",
      count: 3,
    });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    expect(JSON.stringify(out)).not.toContain("지민");
    expect(sanitizeProperties(undefined)).toBeUndefined();
  });
});

describe("refFromSearch", () => {
  it("?ref= 값, 없으면 direct, 이상하면 other", () => {
    expect(refFromSearch("?ref=vote")).toBe("vote");
    expect(refFromSearch("?ref=done&x=1")).toBe("done");
    expect(refFromSearch("")).toBe("direct");
    expect(refFromSearch("?ref=")).toBe("direct");
    expect(refFromSearch("?ref=%3Cscript%3E")).toBe("other");
  });
});

// ---------- PostHog 연결 (posthog-js는 가짜로) ----------
const ph = vi.hoisted(() => ({ init: vi.fn(), register: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: ph }));

const KAKAO_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10.9.0";

describe("analytics / track", () => {
  beforeEach(() => {
    vi.resetModules(); // analytics.ts의 모듈 수준 캐시를 테스트마다 새로
    ph.init.mockClear();
    ph.register.mockClear();
    ph.capture.mockClear();
    vi.stubGlobal("window", { location: { href: `https://a.example/m/ab3defgh?ref=x#${TOKEN}`, pathname: "/m/ab3defgh" } });
    vi.stubGlobal("navigator", { userAgent: KAKAO_UA });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("키가 없으면 아무것도 하지 않아요", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { track } = await import("./track");
    const { capturePageview } = await import("./analytics");
    await track("done_cta_click");
    await capturePageview();
    expect(ph.init).not.toHaveBeenCalled();
    expect(ph.capture).not.toHaveBeenCalled();
  });

  it("초기화: 자동 수집·녹화 끔, localStorage, inApp 공통 속성", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { track } = await import("./track");
    await track("vote_page_view", { slug: "ab3defgh" });
    await track("invite_image_opened");
    expect(ph.init).toHaveBeenCalledTimes(1);
    const [key, config] = ph.init.mock.calls[0];
    expect(key).toBe("phc_test");
    expect(config).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: "localStorage",
      disable_capture_url_hashes: true,
      property_denylist: ["title", "$title"],
    });
    expect(ph.register).toHaveBeenCalledWith({ inApp: "kakaotalk" });
    expect(ph.capture).toHaveBeenNthCalledWith(1, "vote_page_view", { slug: "ab3defgh" }, undefined);
    expect(ph.capture).toHaveBeenNthCalledWith(2, "invite_image_opened", undefined, undefined);
  });

  it("before_send가 모든 이벤트의 주소에서 토큰을 지워요", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { track } = await import("./track");
    await track("done_cta_click");
    const { before_send } = ph.init.mock.calls[0][1];
    const sent = before_send({
      uuid: "u",
      event: "done_cta_click",
      properties: { $current_url: `https://a.example/m/ab3defgh#${TOKEN}`, inApp: "kakaotalk", title: "지민님의 2026 시상식" },
      $set_once: { $initial_current_url: `https://a.example/m/ab3defgh#${TOKEN}` },
    });
    expect(JSON.stringify(sent)).not.toContain(TOKEN);
    expect(sent.properties).toEqual({ $current_url: "https://a.example/m/ab3defgh", inApp: "kakaotalk" });
    expect(before_send(null)).toBeNull();
  });

  it("페이지뷰는 # 뒤와 쿼리 값을 지운 주소로 보내요", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { capturePageview } = await import("./analytics");
    await capturePageview();
    expect(ph.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "https://a.example/m/ab3defgh?ref=x",
      $pathname: "/m/ab3defgh",
    });
  });

  it("beacon 옵션은 sendBeacon으로 바로 보내요(페이지를 떠나기 직전 이벤트)", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { track } = await import("./track");
    await track("ceremony_created", { ref: "direct" }, { beacon: true });
    expect(ph.capture).toHaveBeenCalledWith(
      "ceremony_created",
      { ref: "direct" },
      { transport: "sendBeacon", send_instantly: true },
    );
  });

  it("개발 환경에서는 console.debug로도 보여줘요", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    const { track } = await import("./track");
    await track("link_copied", { where: "owner_page" });
    expect(debug).toHaveBeenCalledWith("[track]", "link_copied", { where: "owner_page" });
  });
});

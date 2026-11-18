import type { ErrorEvent } from "@sentry/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { baseSentryOptions, deepScrub, scrubBreadcrumb, scrubEvent, scrubText } from "./sentry-options";

const TOKEN = "TestToken_TestToken_TestToken_32";

describe("scrubText", () => {
  it("문자열 속 주소의 # 뒤와 쿼리 값을 지워요", () => {
    expect(scrubText(`GET https://a.example/m/ab3defgh?ref=x&name=지민#${TOKEN} failed`)).toBe(
      "GET https://a.example/m/ab3defgh?ref=x failed",
    );
  });

  it("상대 경로에 붙은 토큰(#긴 값)도 지워요", () => {
    expect(scrubText(`/m/ab3defgh#${TOKEN}`)).toBe("/m/ab3defgh");
    expect(scrubText("#section")).toBe("#section"); // 짧은 해시는 그대로
  });
});

describe("scrubEvent", () => {
  it("사용자·쿠키·본문·쿼리·헤더를 빼고 주소의 토큰을 지워요", () => {
    const event = {
      type: undefined,
      message: `오류 at https://a.example/m/ab3defgh#${TOKEN}`,
      user: { ip_address: "203.0.113.7", id: "voter" },
      request: {
        url: `https://a.example/m/ab3defgh#${TOKEN}`,
        method: "POST",
        cookies: { voterId: "V1StGXR8_Z5jdHi6B-myT" },
        headers: { authorization: `Bearer ${TOKEN}`, "x-forwarded-for": "203.0.113.7" },
        data: { reason: "매일 웃게 해줘서", senderName: "하은" },
        query_string: "name=지민",
      },
      breadcrumbs: [{ category: "navigation", data: { from: "/", to: `/m/ab3defgh#${TOKEN}` } }],
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            stacktrace: { frames: [{ abs_path: "https://a.example/_next/static/chunks/a.js?dpl=abc" }] },
          },
        ],
      },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);
    const json = JSON.stringify(out);
    for (const secret of [TOKEN, "203.0.113.7", "V1StGXR8", "매일 웃게", "하은", "지민"]) {
      expect(json).not.toContain(secret);
    }
    expect(out.user).toBeUndefined();
    expect(out.request).toEqual({ url: "https://a.example/m/ab3defgh", method: "POST" });
    expect(out.message).toBe("오류 at https://a.example/m/ab3defgh");
    expect(out.breadcrumbs?.[0].data).toEqual({ from: "/", to: "/m/ab3defgh" });
    // 스택 프레임은 소스맵 연결을 위해 그대로
    expect(out.exception?.values?.[0].stacktrace?.frames?.[0].abs_path).toBe(
      "https://a.example/_next/static/chunks/a.js?dpl=abc",
    );
    // 원본은 바꾸지 않는다
    expect(event.user).toBeDefined();
  });
});

describe("scrubBreadcrumb / deepScrub", () => {
  it("fetch·navigation 브레드크럼의 주소를 정리해요", () => {
    expect(
      scrubBreadcrumb({ category: "fetch", data: { url: "https://a.example/api/x?token=abc", status_code: 200 } }),
    ).toEqual({ category: "fetch", data: { url: "https://a.example/api/x", status_code: 200 } });
    expect(deepScrub({ a: [{ b: `https://a.example/#${TOKEN}` }], n: 1, ok: true })).toEqual({
      a: [{ b: "https://a.example/" }],
      n: 1,
      ok: true,
    });
  });
});

describe("결과 이미지 서명 값(sig·exp)", () => {
  it("쿼리의 sig·exp를 지워요(이벤트·브레드크럼 모두)", () => {
    const url = "https://a.example/api/result/ab3defgh.png?sig=SECRETSIG&exp=1798000000&ref=story";
    expect(scrubText(url)).toBe("https://a.example/api/result/ab3defgh.png?ref=story");
    const crumb = scrubBreadcrumb({ category: "fetch", data: { url, method: "GET" } });
    expect(JSON.stringify(crumb)).not.toContain("SECRETSIG");
    expect(JSON.stringify(crumb)).not.toContain("1798000000");
  });
});

describe("baseSentryOptions", () => {
  afterEach(() => vi.unstubAllEnvs());
  const DSN = "https://k@o1.ingest.us.sentry.io/1";

  it("프로덕션 빌드이고 DSN이 있을 때만 켜져요", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(baseSentryOptions(DSN, "production").enabled).toBe(true);
    expect(baseSentryOptions(undefined, "production").enabled).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(baseSentryOptions(DSN, undefined).enabled).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(baseSentryOptions(DSN, undefined).enabled).toBe(false);
  });

  it("추적 10%, 트랜잭션 정리(static), 수집 범주는 모두 끔, 화면 녹화 없음", () => {
    vi.stubEnv("NODE_ENV", "production");
    const on = baseSentryOptions(DSN, "production");
    expect(on.environment).toBe("production");
    expect(on.tracesSampleRate).toBe(0.1);
    expect(on.traceLifecycle).toBe("static");
    expect(typeof on.beforeSend).toBe("function");
    expect(typeof on.beforeSendTransaction).toBe("function");
    expect(typeof on.beforeBreadcrumb).toBe("function");
    expect(on.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    });
    expect(on.integrations).toBeUndefined(); // replay·피드백 없음
  });

  it("beforeSendTransaction도 본문·쿠키·Authorization·토큰을 지워요", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { beforeSendTransaction } = baseSentryOptions(DSN, "production");
    const tx = {
      type: "transaction",
      transaction: "/m/[slug]",
      request: {
        url: "https://a.example/m/ab3defgh#TestToken_TestToken_TestToken_32",
        headers: { authorization: "Bearer TestToken_TestToken_TestToken_32" },
        cookies: { voterId: "V1StGXR8_Z5jdHi6B-myT" },
        data: "{\"reason\":\"비밀사유\"}",
      },
      spans: [{ data: { "url.full": "https://a.example/api/result/x.png?sig=S&exp=1" } }],
    } as unknown as Parameters<NonNullable<typeof beforeSendTransaction>>[0];
    const out = beforeSendTransaction!(tx, {});
    const json = JSON.stringify(out);
    for (const secret of ["TestToken_", "V1StGXR8", "비밀사유", "sig=", "exp="]) {
      expect(json).not.toContain(secret);
    }
  });
});

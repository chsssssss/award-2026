// PostHog 연결. NEXT_PUBLIC_POSTHOG_KEY가 없으면 아무것도 하지 않는다(라이브러리도 내려받지 않는다).
// 쿠키 대신 localStorage, 자동 수집(클릭·페이지뷰·화면 녹화) 모두 끔. 주소는 sanitizeUrl로 정리해서 보낸다.

import type { PostHog } from "posthog-js";

import { DENIED_PROPERTIES, sanitizeProperties, sanitizeUrl } from "./analytics-url";
import { getInAppBrowser } from "./inapp";

let client: Promise<PostHog | null> | null = null;

function getClient(): Promise<PostHog | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return Promise.resolve(null);

  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
        persistence: "localStorage", // 쿠키를 쓰지 않는다
        autocapture: false,
        capture_pageview: false, // 페이지뷰는 정리한 주소로 직접 보낸다
        capture_pageleave: false,
        disable_session_recording: true,
        disable_capture_url_hashes: true,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_performance: false,
        rageclick: false,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        person_profiles: "identified_only",
        property_denylist: [...DENIED_PROPERTIES],
        // 마지막 안전장치: 모든 이벤트의 주소 속성에서 # 뒤와 쿼리 값을 지운다
        before_send: (event) =>
          event && {
            ...event,
            properties: sanitizeProperties(event.properties),
            $set: sanitizeProperties(event.$set),
            $set_once: sanitizeProperties(event.$set_once),
          },
      });
      // 모든 이벤트의 공통 속성
      posthog.register({ inApp: getInAppBrowser(navigator.userAgent) ?? "other" });
      return posthog;
    })
    .catch(() => null);
  return client;
}

export type CaptureOptions = { beacon?: boolean };

/** 이벤트 보내기. 키가 없으면 바로 끝난다. beacon이면 페이지를 떠나도 전송되도록 sendBeacon으로. */
export async function capture(
  event: string,
  properties?: Record<string, unknown>,
  options?: CaptureOptions,
): Promise<void> {
  const posthog = await getClient();
  posthog?.capture(
    event,
    properties,
    options?.beacon ? { transport: "sendBeacon", send_instantly: true } : undefined,
  );
}

/** 페이지뷰. # 뒤(관리 토큰)와 쿼리 값을 지운 주소만 보낸다. */
export async function capturePageview(): Promise<void> {
  const posthog = await getClient();
  if (!posthog) return;
  posthog.capture("$pageview", {
    $current_url: sanitizeUrl(window.location.href),
    $pathname: window.location.pathname,
  });
}

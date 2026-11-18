"use client";

// 앱 전체에서 처리되지 않은 렌더링 오류. 루트 레이아웃을 대신하므로 html·body와 스타일을 직접 둔다.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { colors } from "@/lib/colors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: colors.bg,
          color: colors.ink,
          fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ width: "100%", maxWidth: 382 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>문제가 생겼어요</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: colors.muted }}>잠시 후 다시 시도해 주세요</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              width: "100%",
              height: 56,
              border: 0,
              borderRadius: 16,
              background: colors.gold,
              color: colors.onGold,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
          {/* 오류 화면에서는 클라이언트 라우터를 믿지 않고 새로 불러온다 */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-flex",
              minHeight: 44,
              alignItems: "center",
              marginTop: 8,
              fontSize: 14,
              color: colors.muted,
            }}
          >
            처음으로
          </a>
        </main>
      </body>
    </html>
  );
}

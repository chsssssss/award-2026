// 브라우저 Sentry 초기화. 화면 녹화(Session Replay)는 쓰지 않는다(이름·사유가 화면에 보여서).
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry-options";

Sentry.init(
  baseSentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_VERCEL_ENV),
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

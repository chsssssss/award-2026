// 서버(Node.js) Sentry 초기화. instrumentation.ts가 불러온다.
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry-options";

Sentry.init({
  ...baseSentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV),
  // 서버의 console.error·warn을 Sentry 로그로. 서버 코드는 에러 코드만 남기도록 써 두었다(이름·토큰·IP 없음).
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] })],
});

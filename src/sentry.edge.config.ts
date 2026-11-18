// 엣지 런타임 Sentry 초기화(지금은 엣지 라우트가 없지만 Next.js가 쓰면 바로 적용되도록 둔다).
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/sentry-options";

Sentry.init(baseSentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV));

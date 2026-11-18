// Sentry 공통 설정(브라우저·서버·엣지). CLAUDE.md: 토큰·IP·voterId·이름·메시지를 에러 리포트에 남기지 않는다.
// - NODE_ENV가 production일 때만 켠다(Vercel의 프로덕션·미리보기 빌드).
// - dataCollection으로 IP·쿠키·헤더·요청 본문·쿼리·지역 변수 수집을 끈다.
//   (v11에서 sendDefaultPii 옵션은 없어졌고 dataCollection이 그 역할을 한다)
// - beforeSend·beforeSendTransaction·beforeBreadcrumb에서 요청 본문·쿠키·헤더(Authorization 포함)를 버리고,
//   주소의 # 뒤(관리 토큰)와 쿼리 값(sig·exp 포함, ref만 남김)을 지운다(analytics-url의 sanitizeUrl과 같은 규칙).
// - 화면 녹화(Session Replay)와 사용자 피드백 위젯은 쓰지 않는다.

import type { Breadcrumb, ErrorEvent, Log, Options, TransactionEvent } from "@sentry/core";

import { sanitizeUrl } from "./analytics-url";

/** 관리 토큰처럼 # 뒤에 붙는 긴 값(base64url 16자 이상) */
const HASH_TOKEN = /#[A-Za-z0-9_-]{16,}/g;
const ABSOLUTE_URL = /https?:\/\/[^\s"'<>`]+/gi;

/** 문자열 안의 주소에서 # 뒤와 쿼리 값을 지운다. */
export function scrubText(text: string): string {
  return text.replace(ABSOLUTE_URL, (url) => sanitizeUrl(url)).replace(HASH_TOKEN, "");
}

/** 스택 프레임은 소스맵 연결에 쓰이므로 건드리지 않는다. */
const SKIP_KEYS = new Set(["stacktrace", "frames", "debug_meta"]);

/** 객체 안의 모든 문자열에 scrubText를 적용한 복사본. */
export function deepScrub<T>(value: T, depth = 0): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (depth > 10 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => deepScrub(item, depth + 1)) as T;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SKIP_KEYS.has(key) ? item : deepScrub(item, depth + 1);
  }
  return out as T;
}

/** 오류·트랜잭션 이벤트: 사용자·쿠키·헤더·본문·쿼리를 빼고 주소를 정리한다. */
export function scrubEvent<E extends ErrorEvent | TransactionEvent>(event: E): E {
  const copy = { ...event };
  delete copy.user;
  if (copy.request) {
    // 주소와 메서드만 남긴다(쿠키·헤더·본문·쿼리는 버린다)
    const { url, method } = copy.request;
    copy.request = { ...(url ? { url } : {}), ...(method ? { method } : {}) };
  }
  return deepScrub(copy);
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return deepScrub(breadcrumb);
}

export function scrubLog(log: Log): Log {
  return deepScrub(log);
}

export const TRACES_SAMPLE_RATE = 0.1;

/** 세 런타임이 같이 쓰는 init 옵션. 프로덕션 빌드이고 DSN이 있을 때만 보낸다. */
export function baseSentryOptions(dsn: string | undefined, environment: string | undefined): Options {
  return {
    dsn,
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    environment: environment || process.env.NODE_ENV,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    // 추적을 트랜잭션 단위로 보낸다. 기본값(stream)에서는 beforeSendTransaction이 무시되므로
    // 트랜잭션 정리가 확실히 적용되도록 static을 쓴다(SDK v12로 올릴 때 beforeSendSpan으로 옮긴다).
    traceLifecycle: "static",
    dataCollection: {
      userInfo: false, // IP·사용자 정보
      cookies: false, // voterId 쿠키
      httpHeaders: false, // Authorization(관리 토큰), x-forwarded-for(IP)
      httpBodies: [], // 이름·상 이름·사유·닉네임이 담긴 요청 본문
      urlQueryParams: false,
      stackFrameVariables: false, // 오류 지점의 지역 변수 값
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    },
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event), // 트랜잭션 안의 span 데이터까지 정리된다
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSendLog: (log) => scrubLog(log),
  };
}

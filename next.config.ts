import type { NextConfig } from "next";

// 메타데이터를 <head>에 먼저 넣어 줘야 하는 봇(링크 미리보기 수집기 등).
// 이 목록에 없는 요청은 메타데이터가 본문 뒤쪽으로 스트리밍된다.
// 앞부분은 Next.js 16.4 기본 목록(next/dist/shared/lib/router/utils/html-bots.js)을 그대로 옮긴 것이고,
// 기본 목록에 없는 카카오톡 미리보기 수집기(kakaotalk-scrap)·다음 검색(Daumoa)·텔레그램을 덧붙였다.
const HTML_LIMITED_BOTS = new RegExp(
  [
    "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou",
    "bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot",
    "facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp",
    "SkypeUriPreview|Yeti|googleweblight",
    "kakaotalk-scrap|Daumoa|TelegramBot",
  ].join("|"),
  "i",
);

const nextConfig: NextConfig = {
  // 에이전트가 next dev를 실행할 때 AGENTS.md를 자동 생성하지 않는다(기준 문서는 CLAUDE.md).
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // 이미지 라우트(링크 미리보기 /opengraph-image, 스토리 이미지 /api/story/*)가 실행 중에 읽는 폰트.
  // fs.readFile로 읽는 파일은 배포 묶음에서 빠질 수 있어서 직접 포함시킨다.
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./assets/fonts/**"],
    "/api/story/**": ["./assets/fonts/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 에이전트가 next dev를 실행할 때 AGENTS.md를 자동 생성하지 않는다(기준 문서는 CLAUDE.md).
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
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

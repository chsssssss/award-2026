import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as devPreview } from "@/app/api/dev/og-preview/route";

import { getOgFonts } from "./og-fonts";
import { OG_CACHE_CONTROL, renderCeremonyImage, renderDefaultImage } from "./og-image";

afterEach(() => vi.unstubAllEnvs());

/** PNG 서명과 IHDR의 가로·세로. */
async function pngSize(response: Response) {
  const buf = Buffer.from(await response.arrayBuffer());
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("getOgFonts", () => {
  it("세 폰트를 TrueType으로 읽고, 다시 불러도 같은 Promise를 준다", async () => {
    const first = getOgFonts();
    expect(getOgFonts()).toBe(first);
    const fonts = await first;
    expect(fonts.map(({ name, weight }) => `${name}:${weight}`)).toEqual([
      "Myeongjo:800",
      "NotoSansKR:400",
      "NotoSansKR:700",
    ]);
    for (const font of fonts) {
      const data = Buffer.from(font.data as Buffer);
      expect(data.readUInt32BE(0)).toBe(0x00010000); // TrueType(glyf), woff2 아님
    }
  });
});

describe("미리보기 이미지", () => {
  it("시상식 이미지는 1200×630 PNG이고 하루 동안 캐시된다", async () => {
    const response = await renderCeremonyImage("김수한무거북이와");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe(OG_CACHE_CONTROL);
    expect(await pngSize(response)).toEqual({ width: 1200, height: 630 });
  }, 30_000);

  it("기본 이미지도 1200×630 PNG", async () => {
    const response = await renderDefaultImage();
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(await pngSize(response)).toEqual({ width: 1200, height: 630 });
  }, 30_000);
});

describe("GET /api/dev/og-preview", () => {
  const request = (query: string) =>
    ({ nextUrl: new URL(`http://localhost/api/dev/og-preview${query}`) }) as NextRequest;

  it("프로덕션에서는 404", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await devPreview(request("?name=지민"));
    expect(response.status).toBe(404);
  });

  it("개발 중에는 이름으로 이미지를 그린다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await devPreview(request("?name=Victoria"));
    expect(response.status).toBe(200);
    expect(await pngSize(response)).toEqual({ width: 1200, height: 630 });
  }, 30_000);
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { colorTokens } from "./colors";

describe("color tokens", () => {
  it("globals.css의 @theme 색과 colors.ts가 같아요", () => {
    const css = readFileSync(
      fileURLToPath(new URL("../app/globals.css", import.meta.url)),
      "utf8",
    );
    const fromCss = Object.fromEntries(
      [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
        m[1],
        m[2].toUpperCase(),
      ]),
    );
    const fromTs = Object.fromEntries(
      colorTokens.map(({ name, hex }) => [name, hex.toUpperCase()]),
    );
    expect(fromCss).toEqual(fromTs);
  });
});

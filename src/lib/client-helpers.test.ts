import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchJson,
  NETWORK_ERROR_MESSAGE,
  postJson,
  UNKNOWN_ERROR_MESSAGE,
} from "./fetch-json";
import { copyText } from "./clipboard";
import { buildFriendUrl, buildManageUrl, displayUrl, parseOwnerToken } from "./owner-link";
import { readStorage, savedLinkKey, writeStorage } from "./storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson / postJson", () => {
  it("성공 응답의 JSON을 돌려줘요", async () => {
    const fetchMock = vi.fn(async () => Response.json({ slug: "abc" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await postJson("/api/ceremonies", { name: "지민" });
    expect(result).toEqual({ ok: true, status: 201, data: { slug: "abc" } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "지민" }));
  });

  it("서버 에러는 응답의 message를 그대로 써요", async () => {
    for (const [status, error, message] of [
      [400, "invalid", "이름은 8자까지 쓸 수 있어요"],
      [410, "season_over", "올해 시상식은 끝났어요"],
      [429, "rate_limited", "요청이 많아요. 잠시 후 다시 시도해주세요"],
      [500, "server_error", "잠시 후 다시 시도해주세요"],
    ] as const) {
      vi.stubGlobal("fetch", async () => Response.json({ error, message }, { status }));
      expect(await fetchJson("/x")).toMatchObject({ ok: false, status, error, message });
    }
  });

  it("JSON이 아닌 에러 응답이면 기본 문장", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>502</html>", { status: 502 }));
    expect(await fetchJson("/x")).toMatchObject({
      ok: false,
      status: 502,
      message: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("네트워크 오류면 연결 문장", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await fetchJson("/x")).toEqual({
      ok: false,
      status: null,
      error: "network",
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it("중단(abort)은 aborted로 구분해요", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("aborted", "AbortError");
    });
    expect((await fetchJson("/x")).ok).toBe(false);
    expect(await fetchJson("/x")).toMatchObject({ error: "aborted" });
  });
});

describe("storage", () => {
  it("localStorage가 예외를 던져도 에러 없이 처리해요", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(readStorage("k")).toBeNull();
    expect(writeStorage("k", "v")).toBe(false);
  });

  it("정상이면 읽고 써요", () => {
    const map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    });
    expect(writeStorage(savedLinkKey("abc"), "1")).toBe(true);
    expect(readStorage("saved:abc")).toBe("1");
  });
});

describe("owner-link", () => {
  const TOKEN = "TestToken_TestToken_TestToken_32";

  it("해시에서 토큰을 꺼내요", () => {
    expect(parseOwnerToken(`#${TOKEN}`)).toBe(TOKEN);
    expect(parseOwnerToken(TOKEN)).toBe(TOKEN);
  });

  it("비었거나 형식이 틀리면 null", () => {
    expect(parseOwnerToken("")).toBeNull();
    expect(parseOwnerToken("#")).toBeNull();
    expect(parseOwnerToken("#short")).toBeNull();
    expect(parseOwnerToken("#bad token with spaces!!")).toBeNull();
    expect(parseOwnerToken("#%E0%A4%A")).toBeNull(); // 잘못된 인코딩
  });

  it("정리된 관리 링크를 만들어요", () => {
    expect(buildManageUrl("https://a.example/", "ab3defgh", TOKEN)).toBe(
      `https://a.example/m/ab3defgh#${TOKEN}`,
    );
  });

  it("친구용 링크는 /s/[slug]이고 토큰이 없어요", () => {
    const url = buildFriendUrl("https://a.example//", "ab3defgh");
    expect(url).toBe("https://a.example/s/ab3defgh");
    expect(url).not.toContain("#");
    expect(displayUrl(url)).toBe("a.example/s/ab3defgh");
    expect(displayUrl("http://localhost:3000/s/ab3defgh")).toBe("localhost:3000/s/ab3defgh");
  });
});

describe("copyText", () => {
  function stubDocument(execResult: boolean | "throw") {
    const textarea = {
      value: "",
      style: {} as Record<string, string>,
      setAttribute: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
      remove: vi.fn(),
    };
    const execCommand = vi.fn(() => {
      if (execResult === "throw") throw new Error("blocked");
      return execResult;
    });
    vi.stubGlobal("document", {
      createElement: () => textarea,
      body: { appendChild: vi.fn() },
      execCommand,
    });
    return { textarea, execCommand };
  }

  it("Clipboard API가 되면 그걸로 복사해요", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { execCommand } = stubDocument(true);
    expect(await copyText("https://a.example/s/ab3defgh")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://a.example/s/ab3defgh");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("Clipboard API가 막히면 execCommand로", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } });
    const { textarea, execCommand } = stubDocument(true);
    expect(await copyText("x")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(textarea.remove).toHaveBeenCalled();
  });

  it("둘 다 안 되면 false(직접 복사 안내)", async () => {
    vi.stubGlobal("navigator", {});
    stubDocument(false);
    expect(await copyText("x")).toBe(false);
    stubDocument("throw");
    expect(await copyText("x")).toBe(false);
  });
});

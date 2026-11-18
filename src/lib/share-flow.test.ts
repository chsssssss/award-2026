import { afterEach, describe, expect, it, vi } from "vitest";

import { getInAppBrowser, isAndroid, isInAppBrowser, isIOS } from "./inapp";
import { canShareFile, fetchImageFile, shareImageFile } from "./share-image";
import { track } from "./track";

const UA = {
  instagramIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 357.0.0.25.101 (iPhone15,3; iOS 18_1; ko_KR; ko; scale=3.00; 1290x2796; 658540329)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Instagram 357.0.0.49.92 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918N; dm3q; qcom; ko_KR; 659202010)",
  kakaoIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.0",
  kakaoAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36;KAKAOTALK 2410900",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  desktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

describe("inapp", () => {
  it("인스타그램·카카오톡 인앱 브라우저를 구분해요", () => {
    expect(getInAppBrowser(UA.instagramIOS)).toBe("instagram");
    expect(getInAppBrowser(UA.instagramAndroid)).toBe("instagram");
    expect(getInAppBrowser(UA.kakaoIOS)).toBe("kakaotalk");
    expect(getInAppBrowser(UA.kakaoAndroid)).toBe("kakaotalk");
  });

  it("일반 브라우저는 other, UA가 없으면 null", () => {
    expect(getInAppBrowser(UA.safari)).toBe("other");
    expect(getInAppBrowser(UA.chromeAndroid)).toBe("other");
    expect(getInAppBrowser(UA.desktop)).toBe("other");
    expect(getInAppBrowser("")).toBeNull();
    expect(getInAppBrowser(null)).toBeNull();
    expect(getInAppBrowser(undefined)).toBeNull();
  });

  it("isInAppBrowser · isIOS · isAndroid", () => {
    expect(isInAppBrowser(UA.kakaoAndroid)).toBe(true);
    expect(isInAppBrowser(UA.safari)).toBe(false);
    expect(isInAppBrowser(null)).toBe(false);
    expect(isIOS(UA.instagramIOS)).toBe(true);
    expect(isIOS(UA.kakaoAndroid)).toBe(false);
    expect(isAndroid(UA.kakaoAndroid)).toBe(true);
    expect(isAndroid(UA.safari)).toBe(false);
    expect(isIOS(null) || isAndroid(null)).toBe(false);
  });
});

describe("track", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("개발 환경에서만 console.debug", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    track("invite_image_opened");
    expect(debug).not.toHaveBeenCalled();

    vi.stubEnv("NODE_ENV", "development");
    track("link_copied", { where: "owner_page" });
    expect(debug).toHaveBeenCalledWith("[track]", "link_copied", { where: "owner_page" });
  });
});

describe("share-image", () => {
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

  it("이미지를 File로 받아요", async () => {
    const fetchMock = vi.fn(async () => new Response(png, { headers: { "Content-Type": "image/png" } }));
    const file = await fetchImageFile("/api/story/invite/ab3defgh", "award-2026-invite.png", fetchMock);
    expect(fetchMock).toHaveBeenCalledWith("/api/story/invite/ab3defgh");
    expect(file.name).toBe("award-2026-invite.png");
    expect(file.type).toBe("image/png");
    expect(file.size).toBe(4);
  });

  it("이미지 응답이 실패하면 에러", async () => {
    const fetchMock = vi.fn(async () => new Response("x", { status: 404 }));
    await expect(fetchImageFile("/x", "a.png", fetchMock)).rejects.toThrow();
  });

  const file = new File([png], "award-2026-invite.png", { type: "image/png" });

  it("파일 공유가 되면 share({files, title})", async () => {
    const share = vi.fn(async () => {});
    const result = await shareImageFile(file, "초대 이미지", { share, canShare: () => true });
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file], title: "초대 이미지" });
  });

  it("사용자가 공유 창을 닫으면 cancelled(에러 아님)", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    expect(await shareImageFile(file, "t", { share, canShare: () => true })).toBe("cancelled");
  });

  it("권한 등으로 실패하면 failed", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("not allowed", "NotAllowedError");
    });
    expect(await shareImageFile(file, "t", { share, canShare: () => true })).toBe("failed");
  });

  it("canShareFile: 공유 창으로 파일을 보낼 수 있는지", () => {
    const share = vi.fn(async () => {});
    expect(canShareFile(file, { share, canShare: () => true })).toBe(true);
    expect(canShareFile(file, { share, canShare: () => false })).toBe(false);
    expect(canShareFile(file, { canShare: () => true })).toBe(false); // share 없음
    expect(canShareFile(file, {})).toBe(false);
    expect(canShareFile(file, undefined)).toBe(false);
    expect(
      canShareFile(file, {
        share,
        canShare: () => {
          throw new TypeError("bad");
        },
      }),
    ).toBe(false);
  });

  it("Web Share가 없거나 파일을 못 나누면 unsupported", async () => {
    const share = vi.fn(async () => {});
    expect(await shareImageFile(file, "t", {})).toBe("unsupported");
    expect(await shareImageFile(file, "t", undefined)).toBe("unsupported");
    expect(await shareImageFile(file, "t", { share, canShare: () => false })).toBe("unsupported");
    expect(
      await shareImageFile(file, "t", {
        share,
        canShare: () => {
          throw new TypeError("bad");
        },
      }),
    ).toBe("unsupported");
    expect(share).not.toHaveBeenCalled();
  });
});

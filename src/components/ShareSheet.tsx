"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/Button";
import { CloseIcon } from "@/components/icons";
import { ManualCopyField } from "@/components/ManualCopyField";
import { isInAppBrowser } from "@/lib/inapp";
import { canShareFile, fetchImageFile, shareImageFile } from "@/lib/share-image";
import { track } from "@/lib/track";
import { useCopy } from "@/lib/use-copy";

type Props = {
  imageUrl: string;
  imageFileName: string;
  /** 시트가 열리면 클립보드에 복사를 시도하는 주소(친구용 링크) */
  linkToCopy: string;
  /** 시트 제목. 공유 시트의 제목으로도 쓴다. */
  title: string;
  onClose: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 공유 창으로 바로 올릴 수 있을 때 / 이미지를 저장해서 올려야 할 때의 안내 */
const STEPS = {
  share: ["‘인스타 스토리에 공유하기’ 누르기", "공유 창에서 Instagram → 스토리 고르기", "링크 스티커에 복사한 주소 붙여넣기"],
  save: ["이미지를 길게 눌러 저장", "인스타 스토리에 올리기", "링크 스티커에 복사한 주소 붙여넣기"],
} as const;

/**
 * 인스타 스토리 공유 + 링크 복사를 돕는 전체 화면 시트. 부모가 열 때만 렌더한다(마운트 = 열림).
 * 휴대폰 공유 창(Web Share)으로 이미지를 넘겨 Instagram → 스토리로 바로 올리게 하고,
 * 공유를 못 하는 브라우저(일부 인앱 브라우저·컴퓨터)는 길게 눌러 저장하도록 안내한다.
 */
export function ShareSheet({ imageUrl, imageFileName, linkToCopy, title, onClose }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<Promise<File | null> | null>(null);
  const opened = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { state: copyState, copy } = useCopy(2500);
  const [inApp] = useState(() => isInAppBrowser(navigator.userAgent));
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [imageKey, setImageKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shareGuide, setShareGuide] = useState(false);
  // 이미지를 받아 본 뒤 정한다: 공유 창으로 보낼 수 있으면 share, 아니면 save
  const [mode, setMode] = useState<"share" | "save">("share");
  // 인앱 브라우저면 처음부터, 아니면 공유가 안 될 때 "길게 눌러 저장" 안내
  const [longPressHint, setLongPressHint] = useState(inApp);

  const copyLink = useCallback(async () => {
    if (await copy(linkToCopy)) track("link_copied", { where: "share_sheet" });
  }, [copy, linkToCopy]);

  const loadFile = useCallback(() => {
    fileRef.current ??= fetchImageFile(imageUrl, imageFileName).catch(() => {
      fileRef.current = null; // 실패는 남기지 않고 다음에 다시 받는다
      return null;
    });
    return fileRef.current;
  }, [imageUrl, imageFileName]);

  // 열릴 때: 기록, 링크 복사 시도(버튼을 누른 직후라 브라우저가 허용하는 시점), 이미지 파일 미리 받기
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("invite_image_opened");
    void copyLink();
    void loadFile().then((file) => {
      if (file && !canShareFile(file)) setMode("save");
    });
  }, [copyLink, loadFile]);

  // 스크롤 잠금 + 포커스 이동/복원
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // ESC로 닫기 + 포커스 가두기. 포커스가 어디 있든 받도록 문서에 건다.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      const root = panel.current;
      if (event.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !root.contains(active);
      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function shareImage() {
    if (busy) return;
    setBusy(true);
    const file = await loadFile();
    let result: Awaited<ReturnType<typeof shareImageFile>> = "failed";
    if (file) {
      setShareGuide(true); // 공유 창이 뜨면 Instagram → 스토리를 고르라는 안내
      result = await shareImageFile(file, title);
      setShareGuide(false);
    }
    setBusy(false);

    if (result === "shared") {
      track("invite_image_shared", { method: "web_share" });
      return;
    }
    if (result === "cancelled") return; // 사용자가 닫음: 아무것도 표시하지 않는다

    setMode("save");
    setLongPressHint(true);
    track("invite_image_shared", { method: "long_press_hint" });
    // 공유를 못 하는 일반 브라우저(컴퓨터 등)는 파일로 내려받기도 시도한다
    if (file && result === "unsupported" && !inApp) download(file);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // 배경을 누르면 닫기
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-y-auto overscroll-contain bg-bg px-6 pb-8"
      >
        <div className="sticky top-0 z-10 -mx-6 flex h-14 shrink-0 items-center justify-between bg-bg px-6">
          <h2 id={titleId} className="text-[17px] font-bold">
            {title}
          </h2>
          <button
            ref={closeButton}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="-mr-2.5 flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-gold-light active:bg-card-2"
          >
            <CloseIcon />
          </button>
        </div>

        {shareGuide && (
          <p role="status" className="mb-3 rounded-[14px] bg-card px-4 py-3 text-center text-sm">
            공유 창에서 <b className="text-gold">Instagram</b>을 누르고 <b className="text-gold">스토리</b>를 골라 주세요
          </p>
        )}

        <div className="relative mx-auto aspect-[9/16] h-[min(60dvh,calc((min(100vw,430px)-48px)*16/9))] shrink-0">
          {imageState !== "ready" && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-2xl bg-card ${imageState === "loading" ? "animate-pulse" : ""}`}
            />
          )}
          {imageState === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-sm text-muted">이미지를 불러오지 못했어요</p>
              <button
                type="button"
                onClick={() => {
                  setImageState("loading");
                  setImageKey((key) => key + 1);
                }}
                className="h-11 rounded-[14px] border border-line px-4 text-sm font-medium"
              >
                다시 불러오기
              </button>
            </div>
          ) : (
            // 길게 눌러 저장할 수 있도록 실제 이미지 주소를 쓰는 <img>
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imageKey}
              src={imageKey ? `${imageUrl}?retry=${imageKey}` : imageUrl}
              alt="인스타 스토리에 올릴 초대 이미지"
              width={1080}
              height={1920}
              onLoad={() => setImageState("ready")}
              onError={() => setImageState("error")}
              className={`absolute inset-0 h-full w-full rounded-2xl border border-line object-cover transition-opacity ${
                imageState === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </div>

        {longPressHint && (
          <p className="mt-3 text-center text-sm font-medium">이미지를 길게 눌러 저장한 뒤 인스타 스토리에 올려 주세요</p>
        )}

        <Button className="mt-5 shrink-0" onClick={shareImage} disabled={busy}>
          {mode === "share"
            ? busy
              ? "공유 창 여는 중…"
              : "인스타 스토리에 공유하기"
            : busy
              ? "저장 준비 중…"
              : "이미지 저장하기"}
        </Button>

        <div className="mt-3">
          {copyState === "manual" ? (
            <div className="flex flex-col gap-2.5 rounded-[16px] border-[1.5px] border-gold p-4">
              <button
                type="button"
                onClick={copyLink}
                className="h-12 w-full rounded-[14px] border-[1.5px] border-gold text-[15px] font-bold text-gold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light active:bg-card-2"
              >
                링크 복사
              </button>
              {/* 열자마자 실패한 경우라 포커스를 옮기지 않는다(이미지가 화면 밖으로 밀리지 않게) */}
              <ManualCopyField value={linkToCopy} label="친구에게 보낼 링크" autoSelect={false} />
            </div>
          ) : (
            <Button variant="outline" onClick={copyLink}>
              {copyState === "copied" ? "복사했어요" : "링크 복사"}
            </Button>
          )}
        </div>

        <ol className="mt-6 flex flex-col gap-3">
          {STEPS[mode].map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-gold"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg transition-opacity ${
          copyState === "copied" ? "opacity-100" : "opacity-0"
        }`}
      >
        {copyState === "copied" ? "링크를 복사했어요" : ""}
      </p>
    </div>,
    document.body,
  );
}

function download(file: File) {
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    // 내려받기가 막혀도 "길게 눌러 저장" 안내가 이미 떠 있다
  }
}

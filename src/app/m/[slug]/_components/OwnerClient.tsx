"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { REVEAL_AT } from "@/lib/constants";
import { fetchJson } from "@/lib/fetch-json";
import { buildManageUrl, parseOwnerToken } from "@/lib/owner-link";
import { readStorage, savedLinkKey } from "@/lib/storage";

import { SaveLinkCard } from "./SaveLinkCard";

type PublicCeremonyResponse = {
  name: string;
  revealAt: string;
  trophyCount: number;
  closed: boolean;
};

type CeremonyState =
  | { status: "loading" }
  | { status: "ready"; name: string; revealAt: Date }
  | { status: "not_found" }
  | { status: "error"; message: string };

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const subscribeNothing = () => () => {};

export function OwnerClient({ slug }: { slug: string }) {
  // 서버 렌더링 때는 null(아직 모름), 브라우저에서는 실제 해시. 토큰은 메모리에만 둔다.
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => null,
  );
  const token = hash === null ? undefined : parseOwnerToken(hash);

  const savedBefore = useSyncExternalStore(
    subscribeNothing,
    () => readStorage(savedLinkKey(slug)) !== null,
    () => null,
  );
  const [saveCardClosed, setSaveCardClosed] = useState(false);
  const [ceremony, setCeremony] = useState<CeremonyState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchJson<PublicCeremonyResponse>(`/api/ceremonies/${slug}`, {
      signal: controller.signal,
    }).then((result) => {
      if (result.ok) {
        setCeremony({
          status: "ready",
          name: result.data.name,
          revealAt: new Date(result.data.revealAt),
        });
      } else if (result.error === "aborted") {
        return;
      } else if (result.status === 404) {
        setCeremony({ status: "not_found" });
      } else {
        setCeremony({ status: "error", message: result.message });
      }
    });
    return () => controller.abort();
  }, [slug]);

  const showSaveCard =
    !!token &&
    savedBefore === false &&
    !saveCardClosed &&
    ceremony.status !== "not_found";

  return (
    <main className="flex flex-1 flex-col pt-6 pb-8">
      {token === null && (
        <div role="status" className="mb-6 rounded-[20px] bg-card p-5">
          <p className="text-[15px] font-bold">관리 링크로 들어와 주세요</p>
          <p className="mt-1.5 text-sm leading-[1.6] text-muted">
            만들 때 저장한 링크가 필요해요
          </p>
        </div>
      )}

      {showSaveCard && (
        <div className="mb-6">
          <SaveLinkCard
            slug={slug}
            manageUrl={buildManageUrl(window.location.origin, slug, token)}
            revealAt={ceremony.status === "ready" ? ceremony.revealAt : REVEAL_AT}
            onSaved={() => setSaveCardClosed(true)}
          />
        </div>
      )}

      <CeremonyTitle ceremony={ceremony} />
    </main>
  );
}

function CeremonyTitle({ ceremony }: { ceremony: CeremonyState }) {
  if (ceremony.status === "loading") {
    return (
      <div aria-busy="true">
        <span className="sr-only">불러오는 중</span>
        <div aria-hidden="true" className="h-8 w-52 animate-pulse rounded-lg bg-card" />
        <div aria-hidden="true" className="mt-2 h-5 w-16 animate-pulse rounded bg-card-2" />
      </div>
    );
  }
  if (ceremony.status === "not_found") {
    return (
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.4px]">
        시상식을 찾을 수 없어요
      </h1>
    );
  }
  if (ceremony.status === "error") {
    return <p className="text-sm text-danger">{ceremony.message}</p>;
  }
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.4px]">
        {ceremony.name}의 2026 시상식
      </h1>
      <p className="mt-1.5 text-sm text-muted">준비 중</p>
    </div>
  );
}

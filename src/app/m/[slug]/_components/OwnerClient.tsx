"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/Button";
import { ShareSheet } from "@/components/ShareSheet";
import type { ManageBeforeReveal } from "@/lib/manage-types";
import { buildFriendUrl, buildManageUrl, parseOwnerToken } from "@/lib/owner-link";
import { readStorage, savedLinkKey } from "@/lib/storage";
import { formatDday, formatKoreanDate } from "@/lib/time";

import { FriendLink } from "./FriendLink";
import { RevealedBoard } from "./RevealedBoard";
import { SaveLinkCard } from "./SaveLinkCard";
import { TrophyGrid } from "./TrophyGrid";
import { useManageData, type ManageState } from "./useManageData";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * 내 시상식 화면. 관리 토큰은 주소의 # 뒤에만 있고(서버로 가는 요청 주소에는 없다),
 * 메모리에만 두고 Authorization 헤더로만 보낸다. 토큰이 든 주소는 어디에도 찍지 않는다.
 */
export function OwnerClient({ slug }: { slug: string }) {
  // 서버 렌더링 때는 null(아직 모름), 브라우저에서는 실제 해시
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => null,
  );

  if (hash === null) return <Shell><BoardSkeleton /></Shell>;
  if (hash.replace(/^#/, "") === "") {
    return (
      <Shell>
        <Notice title="관리 링크로 들어와 주세요" body="만들 때 저장한 링크가 필요해요" />
      </Shell>
    );
  }
  const token = parseOwnerToken(hash);
  if (!token) return <Shell><InvalidLink /></Shell>;

  // 토큰이 바뀌면 상태를 처음부터 다시
  return <OwnerBoard key={token} slug={slug} token={token} />;
}

const subscribeNothing = () => () => {};

function OwnerBoard({ slug, token }: { slug: string; token: string }) {
  const { state, retry } = useManageData(slug, token);
  const savedBefore = useSyncExternalStore(
    subscribeNothing,
    () => readStorage(savedLinkKey(slug)) !== null,
    () => null,
  );
  const [saveCardClosed, setSaveCardClosed] = useState(false);

  // 토큰이 맞는 것을 확인한 뒤에만 관리 링크 저장 안내를 띄운다
  const showSaveCard = state.status === "ready" && savedBefore === false && !saveCardClosed;

  return (
    <Shell>
      {showSaveCard && (
        <div className="mb-6">
          <SaveLinkCard
            slug={slug}
            manageUrl={buildManageUrl(window.location.origin, slug, token)}
            revealAt={new Date(state.data.revealAt)}
            onSaved={() => setSaveCardClosed(true)}
          />
        </div>
      )}
      <BoardContent slug={slug} token={token} state={state} retry={retry} />
    </Shell>
  );
}

function BoardContent({
  slug,
  token,
  state,
  retry,
}: {
  slug: string;
  token: string;
  state: ManageState;
  retry: () => void;
}) {
  switch (state.status) {
    case "loading":
      return <BoardSkeleton />;
    case "unauthorized":
      return <InvalidLink />;
    case "error":
      return (
        <div role="alert" className="rounded-[20px] bg-card p-5 text-center">
          <p className="text-sm text-danger">{state.message}</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            다시 시도
          </Button>
        </div>
      );
    case "ready":
      if (state.data.revealed) return <RevealedBoard slug={slug} token={token} data={state.data} />;
      return (
        <BeforeReveal slug={slug} data={state.data} days={state.days} newFrom={state.newFrom} />
      );
  }
}

function BeforeReveal({
  slug,
  data,
  days,
  newFrom,
}: {
  slug: string;
  data: ManageBeforeReveal;
  days: number;
  newFrom: number | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const friendUrl = buildFriendUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, slug);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 font-display text-2xl font-extrabold tracking-[-0.4px]">
          {data.name}의 2026 시상식
        </h1>
        <span className="shrink-0 rounded-full bg-gold px-2.5 py-[5px] text-xs font-bold text-on-gold">
          개최 중
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">친구들이 보내는 트로피를 모으고 있어요</p>

      <div className="mt-5 flex items-center justify-between rounded-[20px] bg-card p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">공개까지</span>
          <span className="font-display text-[40px] leading-[1.1] font-extrabold text-gold">
            {formatDday(days)}
          </span>
        </div>
        <p className="text-right text-sm leading-normal">
          {formatKoreanDate(new Date(data.revealAt))}
          <br />
          <span className="text-muted">한꺼번에 공개</span>
        </p>
      </div>

      <TrophyGrid count={data.trophyCount} newFrom={newFrom} />

      <FriendLink url={friendUrl} />

      <div className="min-h-8 flex-1" />

      <Button onClick={() => setSheetOpen(true)}>스토리용 이미지 저장하기</Button>
      <Button
        variant="outline"
        href={`/s/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5"
      >
        친구 화면 보기
      </Button>

      {sheetOpen && (
        <ShareSheet
          title="스토리 초대 이미지"
          imageUrl={`/api/story/invite/${slug}`}
          imageFileName="award-2026-invite.png"
          linkToCopy={friendUrl}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col pt-6 pb-8">{children}</main>;
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="rounded-[20px] bg-card p-5">
      <p className="text-[15px] font-bold">{title}</p>
      <p className="mt-1.5 text-sm leading-[1.6] text-muted">{body}</p>
    </div>
  );
}

function InvalidLink() {
  return (
    <Notice
      title="링크가 올바르지 않아요"
      body="만들 때 저장한 관리 링크를 그대로 열어 주세요"
    />
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden="true">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-card" />
        <div className="mt-2 h-5 w-60 animate-pulse rounded bg-card-2" />
        <div className="mt-5 h-[104px] animate-pulse rounded-[20px] bg-card" />
        <div className="mt-4 h-[236px] animate-pulse rounded-[20px] bg-card" />
      </div>
    </div>
  );
}

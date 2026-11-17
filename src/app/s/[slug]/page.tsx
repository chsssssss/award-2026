import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { TrophyIcon } from "@/components/TrophyIcon";
import { daysUntil, formatDday, formatKoreanDate } from "@/lib/time";

import { VoteForm } from "./_components/VoteForm";
import { ceremonyMetadata, loadCeremony } from "./load";

export function generateMetadata({ params }: PageProps<"/s/[slug]">) {
  return ceremonyMetadata(params);
}

export default function VotePage({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<main aria-busy="true" className="flex-1" />}>
      <VoteContent params={params} />
    </Suspense>
  );
}

async function VoteContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection(); // 공개 여부·D-day는 요청 시점의 서버 시각으로
  const ceremony = await loadCeremony(slug);
  if (!ceremony) notFound();

  // 공개 시각이 지났으면 결과 내용 없이 종료 안내만
  if (ceremony.closed) return <ClosedView name={ceremony.name} />;

  const now = new Date();
  return (
    <main className="flex flex-1 flex-col pt-6 pb-8">
      <div className="flex h-7 items-center justify-between gap-3">
        <span className="truncate text-[13px] text-muted">{ceremony.name}님의 2026 시상식</span>
        <span className="shrink-0 rounded-full border border-gold px-2.5 py-[3px] text-xs font-bold text-gold">
          {formatDday(daysUntil(ceremony.revealAt, now))}
        </span>
      </div>
      <VoteForm
        slug={slug}
        name={ceremony.name}
        revealDateLabel={formatKoreanDate(ceremony.revealAt)}
      />
    </main>
  );
}

function ClosedView({ name }: { name: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
      <TrophyIcon variant="locked" size={72} />
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.4px]">
          {name}님의 시상식이 끝났어요
        </h1>
        <p className="mt-2 text-sm text-muted">내년에 또 만나요</p>
      </div>
    </main>
  );
}

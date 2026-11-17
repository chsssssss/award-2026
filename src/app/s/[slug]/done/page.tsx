import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/Button";
import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors } from "@/lib/colors";
import { formatKoreanDate } from "@/lib/time";

import { ceremonyMetadata, loadCeremony } from "../load";
import { GivenAwardCard } from "./_components/GivenAwardCard";

export function generateMetadata({ params }: PageProps<"/s/[slug]/done">) {
  return ceremonyMetadata(params);
}

export default function DonePage({ params }: PageProps<"/s/[slug]/done">) {
  return (
    <Suspense fallback={<main aria-busy="true" className="flex-1" />}>
      <DoneContent params={params} />
    </Suspense>
  );
}

async function DoneContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ceremony = await loadCeremony(slug);
  if (!ceremony) notFound();

  return (
    <main className="flex flex-1 flex-col pt-12 pb-8">
      <div className="relative flex h-[170px] items-center justify-center">
        <TrophyIcon size={132} />
        <Sparkle className="absolute top-2.5 left-[calc(50%-79px)]" size={20} />
        <Sparkle
          className="absolute top-[34px] left-[calc(50%+67px)]"
          size={14}
          color={colors.goldLight}
        />
        <Sparkle
          className="absolute bottom-[18px] left-[calc(50%-67px)]"
          size={12}
          color={colors.goldLight}
        />
      </div>

      <h1 className="mt-4 text-center font-display text-[28px] font-extrabold tracking-[-0.4px]">
        트로피를 수여했어요
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        {ceremony.name}님은 {formatKoreanDate(ceremony.revealAt)}에 확인할 수 있어요
      </p>

      <GivenAwardCard slug={slug} />

      <div className="min-h-8 flex-1" />

      <div className="flex flex-col items-center rounded-[20px] border border-line px-5 py-6 text-center">
        <span className="text-lg font-bold">나도 친구들에게 상 받아볼까?</span>
        <span className="mt-1.5 text-sm text-muted">올해가 가기 전에 내 시상식을 열어보세요</span>
        <Button href="/?ref=done" className="mt-[18px]">
          내 시상식 열기
        </Button>
        <span className="mt-2.5 text-[13px] text-subtle">가입 없이 10초면 끝나요</span>
      </div>
    </main>
  );
}

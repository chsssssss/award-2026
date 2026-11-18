import { connection } from "next/server";
import { Suspense } from "react";

import { LegalLinks } from "@/components/LegalLinks";
import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors } from "@/lib/colors";
import { REVEAL_AT } from "@/lib/constants";
import { isRevealed } from "@/lib/time";

import { CreateForm } from "./_components/CreateForm";

const STEPS = ["링크 만들기", "스토리에 공유", "12.31 공개"] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col pt-6 pb-8">
      <header className="flex h-8 items-center justify-between">
        <div className="flex items-center gap-2">
          <TrophyIcon variant="outline" size={20} />
          <span className="text-[15px] font-bold tracking-[-0.2px]">
            올해의 나 시상식
          </span>
        </div>
        <span className="rounded-full border border-gold px-2.5 py-1 text-xs font-bold text-gold">
          2026
        </span>
      </header>

      <div className="relative mt-6 flex h-[200px] items-center justify-center">
        <div className="flex size-[184px] items-center justify-center rounded-full bg-card">
          <TrophyIcon size={112} />
        </div>
        {/* 반짝이 위치는 가운데 기준으로 잡아 화면 너비가 달라도 트로피와의 거리가 같다 */}
        <Sparkle className="absolute top-[18px] left-[calc(50%-107px)]" size={22} />
        <Sparkle
          className="absolute top-[50px] left-[calc(50%+97px)]"
          size={14}
          color={colors.goldLight}
        />
        <Sparkle className="absolute bottom-3.5 left-[calc(50%+81px)]" size={18} />
      </div>

      <h1 className="mt-5 font-display text-[34px] leading-[1.3] font-extrabold tracking-[-0.5px]">
        올해 나는
        <br />
        무슨 상을 받을까?
      </h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-muted">
        친구들이 나에게 어울리는 상을 골라 트로피를 보내줘요. 12월 31일, 한꺼번에
        공개돼요.
      </p>

      <ol className="mt-[22px] grid grid-cols-3 gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className="flex flex-col items-center gap-2 rounded-[14px] bg-card-2 px-1 py-3"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-gold text-[13px] font-bold text-on-gold">
              {index + 1}
            </span>
            <span className="text-[13px] font-medium">{label}</span>
          </li>
        ))}
      </ol>

      <div className="min-h-8 flex-grow" />

      {/* 시즌 종료 여부는 요청 시점의 서버 시각으로 판단한다. 기다리는 동안에는 폼을 먼저 보여준다. */}
      <Suspense fallback={<CreateForm />}>
        <CreateSection />
      </Suspense>

      <LegalLinks className="mt-2" />
    </main>
  );
}

async function CreateSection() {
  await connection();
  if (isRevealed(REVEAL_AT, new Date())) return <SeasonOver />;
  return <CreateForm />;
}

function SeasonOver() {
  return (
    <div className="rounded-[20px] bg-card px-5 py-6 text-center">
      <p className="text-[17px] font-bold">올해 시상식은 끝났어요</p>
      <p className="mt-2 text-sm text-muted">내년에 또 만나요</p>
    </div>
  );
}

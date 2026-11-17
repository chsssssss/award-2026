import type { ReactNode } from "react";

import { Button } from "@/components/Button";
import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors, colorTokens } from "@/lib/colors";

export const metadata = { title: "UI 견본 (dev)" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-medium text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function DevUiPage() {
  return (
    <main className="py-8">
      <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">
        UI 견본
      </h1>
      <p className="mt-2 text-sm text-muted">
        개발 전용 페이지예요. 프로덕션에서는 404예요.
      </p>

      <Section title="버튼">
        <div className="flex flex-col gap-3">
          <Button>내 시상식 열기</Button>
          <Button variant="outline">친구 화면 보기</Button>
          <Button disabled>상을 하나 골라주세요</Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" href="/">
              링크 버튼
            </Button>
            <Button variant="outline" disabled>
              비활성 outline
            </Button>
          </div>
        </div>
      </Section>

      <Section title="트로피">
        <div className="grid grid-cols-3 gap-2.5">
          {(["gold", "locked", "outline"] as const).map((variant) => (
            <div
              key={variant}
              className="flex flex-col items-center gap-2 rounded-[14px] bg-card-2 py-4"
            >
              <TrophyIcon variant={variant} size={56} />
              <span className="text-xs text-muted">{variant}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-4 flex h-[200px] items-center justify-center">
          <div className="flex size-[184px] items-center justify-center rounded-full bg-card">
            <TrophyIcon size={112} />
          </div>
          <Sparkle className="absolute left-16 top-[18px]" size={22} />
          <Sparkle
            className="absolute right-[60px] top-[50px]"
            size={14}
            color={colors.goldLight}
          />
          <Sparkle className="absolute bottom-3.5 right-[72px]" size={18} />
        </div>
      </Section>

      <Section title="색">
        <ul className="grid grid-cols-2 gap-2">
          {colorTokens.map(({ name, hex }) => (
            <li key={name} className="flex items-center gap-3 rounded-[14px] bg-card-2 p-2">
              <span
                className="size-10 shrink-0 rounded-[10px] border border-line"
                style={{ backgroundColor: hex }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{name}</span>
                <span className="block text-xs text-subtle">{hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="글꼴">
        <div className="rounded-[20px] bg-card p-5">
          <p className="text-xs text-subtle">font-display · Nanum Myeongjo 800</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-[1.3] tracking-[-0.5px]">
            올해 나는
            <br />
            무슨 상을 받을까?
          </p>
          <p className="mt-4 text-xs text-subtle">font-display · 700</p>
          <p className="mt-1 font-display text-2xl font-bold">지민의 2026 시상식</p>

          <p className="mt-6 text-xs text-subtle">font-sans · Noto Sans KR 400</p>
          <p className="mt-1 text-[15px] leading-[1.6] text-muted">
            친구들이 나에게 어울리는 상을 골라 트로피를 보내줘요. 12월 31일, 한꺼번에 공개돼요.
          </p>
          <p className="mt-4 text-xs text-subtle">500</p>
          <p className="mt-1 text-[15px] font-medium">시상식 주인공 이름</p>
          <p className="mt-4 text-xs text-subtle">700</p>
          <p className="mt-1 text-[15px] font-bold">도착한 트로피 7개</p>
          <p className="mt-4 text-xs text-subtle">danger</p>
          <p className="mt-1 text-[13px] text-danger">이름은 8자까지 쓸 수 있어요</p>
        </div>
      </Section>
    </main>
  );
}

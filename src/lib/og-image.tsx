import "server-only";

import { ImageResponse } from "next/og";

import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors } from "@/lib/colors";
import { getOgFonts } from "@/lib/og-fonts";
import { fitFontSize } from "@/lib/og-text";

// 링크 미리보기 이미지(1200×630). next/og는 flexbox만 쓴다(grid 없음).
// 트로피 내용은 절대 넣지 않는다. 주인공 이름만 쓴다.

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CACHE_CONTROL = "public, max-age=86400";

const PADDING_X = 88;
const ART_SIZE = 380; // 트로피 원 + 반짝이 자리
const CIRCLE_SIZE = 340;
const GAP = 56;
const TEXT_WIDTH = OG_SIZE.width - PADDING_X * 2 - ART_SIZE - GAP;
const TITLE_SIZE = { max: 72, min: 40 };

type CardProps = {
  title: readonly [string, string];
  sub: string;
};

function Card({ title, sub }: CardProps) {
  const titleSize = fitFontSize(title, TEXT_WIDTH, TITLE_SIZE);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: `0 ${PADDING_X}px`,
        backgroundColor: colors.bg,
        color: colors.ink,
        fontFamily: "NotoSansKR",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: ART_SIZE,
          height: ART_SIZE,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            backgroundColor: colors.card,
          }}
        >
          <TrophyIcon size={208} />
        </div>
        <div style={{ position: "absolute", top: 26, left: 4, display: "flex" }}>
          <Sparkle size={40} />
        </div>
        <div style={{ position: "absolute", top: 84, left: 344, display: "flex" }}>
          <Sparkle size={26} color={colors.goldLight} />
        </div>
        <div style={{ position: "absolute", top: 306, left: 316, display: "flex" }}>
          <Sparkle size={34} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: TEXT_WIDTH,
          marginLeft: GAP,
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 8, color: colors.gold }}>
          2026 AWARDS
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 22,
            fontFamily: "Myeongjo, MyeongjoExt", // 2,350자 밖의 글자는 보조 명조로
            fontWeight: 800,
            fontSize: titleSize,
            lineHeight: 1.3,
            letterSpacing: -1,
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>{title[0]}</div>
          <div style={{ whiteSpace: "nowrap" }}>{title[1]}</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: colors.muted }}>{sub}</div>
      </div>
    </div>
  );
}

async function render(props: CardProps): Promise<ImageResponse> {
  return new ImageResponse(<Card {...props} />, {
    ...OG_SIZE,
    fonts: await getOgFonts(props.title.join("")),
    headers: { "Cache-Control": OG_CACHE_CONTROL },
  });
}

/** 사이트 기본 미리보기. 루트 페이지와 없는 시상식에 쓴다. */
export function renderDefaultImage(): Promise<ImageResponse> {
  return render({ title: ["올해 나는", "무슨 상을 받을까?"], sub: "올해의 나 시상식" });
}

/** 친구용 링크(/s/[slug]) 미리보기. 이름만 받는다. */
export function renderCeremonyImage(name: string): Promise<ImageResponse> {
  return render({ title: [`${name}님의`, "2026 시상식"], sub: "나에게 어울리는 상을 골라줘" });
}

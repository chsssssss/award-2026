import "server-only";

import { ImageResponse } from "next/og";

import { Sparkle } from "@/components/Sparkle";
import { TrophyIcon } from "@/components/TrophyIcon";
import { colors } from "@/lib/colors";
import { getOgFonts } from "@/lib/og-fonts";
import { fitFontSize } from "@/lib/og-text";

// 인스타 스토리용 초대 이미지(1080×1920). design/StoryInvite.dc.html(360×640)을 정확히 3배로 키운 구성.
// next/og는 flexbox만 쓴다. 트로피 내용은 넣지 않고 주인공 이름만 쓴다.

export const STORY_SIZE = { width: 1080, height: 1920 } as const;

const PADDING_X = 96; // 32 × 3
const CONTENT_WIDTH = STORY_SIZE.width - PADDING_X * 2;
const TITLE_SIZE = { max: 120, min: 60 }; // 40 × 3
const TITLE_LINE_HEIGHT = 1.25;

function ChevronDown({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9 L12 15 L18 9"
        fill="none"
        stroke={colors.gold}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InviteStory({ name }: { name: string }) {
  const title = [`${name}의`, "2026 시상식"] as const;
  const titleSize = fitFontSize(title, CONTENT_WIDTH, TITLE_SIZE);
  // 글자가 줄어도 아래 요소 위치가 바뀌지 않게 줄 높이는 최대 크기 기준으로 고정
  const lineBox = TITLE_SIZE.max * TITLE_LINE_HEIGHT;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: `120px ${PADDING_X}px 312px`, // 40·32·104 × 3. 아래 312px는 인스타 링크 스티커 자리
        backgroundColor: colors.bg,
        color: colors.ink,
        fontFamily: "NotoSansKR",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 9, color: colors.gold }}>
        2026 AWARDS
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 42,
          // 2,350자 밖의 글자는 보조 명조(MyeongjoExt)로
          fontFamily: "Myeongjo, MyeongjoExt",
          fontWeight: 800,
          fontSize: titleSize,
          letterSpacing: -1.5,
        }}
      >
        {title.map((line) => (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: lineBox,
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 420,
          marginTop: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 408,
            height: 408,
            borderRadius: 204,
            backgroundColor: colors.card,
          }}
        >
          <TrophyIcon size={264} />
        </div>
        <div style={{ position: "absolute", left: 210, top: 18, display: "flex" }}>
          <Sparkle size={54} />
        </div>
        <div style={{ position: "absolute", right: 222, bottom: 36, display: "flex" }}>
          <Sparkle size={42} color={colors.goldLight} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 72,
          fontSize: 54,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        <div>나에게 어울리는 상을</div>
        <div>골라서 보내줘</div>
      </div>
      <div style={{ marginTop: 24, fontSize: 42, color: colors.muted }}>
        12월 31일에 한꺼번에 공개돼요
      </div>

      <div style={{ display: "flex", flexGrow: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: colors.gold }}>
          링크 눌러서 트로피 주기
        </div>
        <div style={{ display: "flex", marginTop: 12 }}>
          <ChevronDown size={66} />
        </div>
      </div>
    </div>
  );
}

/** 초대 스토리 이미지. 이름만 받는다. headers로 캐시·파일 이름을 정할 수 있다. */
export async function renderInviteStory(
  name: string,
  init?: { headers?: Record<string, string> },
): Promise<ImageResponse> {
  return new ImageResponse(<InviteStory name={name} />, {
    ...STORY_SIZE,
    fonts: await getOgFonts(name),
    headers: init?.headers,
  });
}

import { colors } from "@/lib/colors";

type TrophyIconProps = {
  size?: number;
  /**
   * gold: 금색 트로피(design/Main.dc.html 가운데)
   * locked: 물음표가 들어간 잠긴 트로피(design/Owner.dc.html)
   * outline: 선으로 그린 트로피(design/Main.dc.html 상단 로고)
   */
  variant?: "gold" | "locked" | "outline";
  className?: string;
};

/** 장식용 트로피 아이콘. viewBox 0 0 64 64. */
export function TrophyIcon({
  size = 64,
  variant = "gold",
  className,
}: TrophyIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    "aria-hidden": true,
    className,
  } as const;

  if (variant === "outline") {
    return (
      <svg {...common}>
        <path
          d="M20 10 H44 V24 C44 31.7 38.6 38 32 38 C25.4 38 20 31.7 20 24 Z M20 14 H13 V18 C13 23 16 26 20.5 26 M44 14 H51 V18 C51 23 48 26 43.5 26 M32 38 V47 M21 53 H43"
          fill="none"
          stroke={colors.gold}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "locked") {
    return (
      <svg {...common}>
        <path
          d="M20 14 H13 V18 C13 23 16 26 20.5 26 M44 14 H51 V18 C51 23 48 26 43.5 26"
          fill="none"
          stroke={colors.locked}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M20 10 H44 V24 C44 31.7 38.6 38 32 38 C25.4 38 20 31.7 20 24 Z"
          fill={colors.locked}
        />
        <rect x="29.5" y="37.5" width="5" height="8.5" fill={colors.locked} />
        <rect x="21" y="46" width="22" height="8" rx="2" fill={colors.locked} />
        <text
          x="32"
          y="29.5"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill={colors.muted}
          fontFamily="sans-serif"
        >
          ?
        </text>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M20 14 H13 V18 C13 23 16 26 20.5 26"
        fill="none"
        stroke={colors.gold}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M44 14 H51 V18 C51 23 48 26 43.5 26"
        fill="none"
        stroke={colors.gold}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 10 H44 V24 C44 31.7 38.6 38 32 38 C25.4 38 20 31.7 20 24 Z"
        fill={colors.gold}
      />
      <path
        d="M25.5 14 V23"
        stroke={colors.goldLight}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="29.5" y="37.5" width="5" height="8.5" fill={colors.goldDark} />
      <rect x="23" y="46" width="18" height="5" rx="1.5" fill={colors.goldDark} />
      <rect x="19" y="51" width="26" height="5" rx="1.5" fill={colors.gold} />
    </svg>
  );
}

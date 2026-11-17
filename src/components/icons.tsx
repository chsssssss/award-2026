import { colors } from "@/lib/colors";

// 작은 장식 아이콘(인라인 SVG). 모두 aria-hidden.

type IconProps = { size?: number; color?: string; className?: string };

/** 선택 표시: 금색 원 + 체크(design/Vote.dc.html). */
export function CheckCircleIcon({ size = 18, className }: Omit<IconProps, "color">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="11" fill={colors.gold} />
      <path
        d="M7 12.5 L10.5 16 L17 9"
        fill="none"
        stroke={colors.onGold}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ size = 16, color = colors.muted, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 5 V19 M5 12 H19" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ size = 13, color = colors.muted, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke={color} strokeWidth="2" />
      <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

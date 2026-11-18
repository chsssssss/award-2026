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

export function CloseIcon({ size = 22, color = colors.ink, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 메시지 숨기기: 눈에 사선 */
export function EyeOffIcon({ size = 18, color = colors.subtle, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M3 12 C5.5 7.5 8.5 5.5 12 5.5 C15.5 5.5 18.5 7.5 21 12 C18.5 16.5 15.5 18.5 12 18.5 C8.5 18.5 5.5 16.5 3 12 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.8" />
      <path d="M4 4 L20 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

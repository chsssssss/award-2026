import { colors } from "@/lib/colors";

type SparkleProps = {
  size?: number;
  color?: string;
  className?: string;
};

/** 장식용 4각 별. viewBox 0 0 24 24. */
export function Sparkle({ size = 22, color = colors.gold, className }: SparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z"
        fill={color}
      />
    </svg>
  );
}

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "outline";

type BaseProps = {
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

type AsButton = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps> & {
    href?: undefined;
  };

type AsLink = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof BaseProps | "href"> & {
    href: string;
  };

export type ButtonProps = AsButton | AsLink;

const base =
  "flex w-full select-none items-center justify-center text-center transition-[background-color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light";

const sizes: Record<Variant, string> = {
  primary: "h-14 rounded-2xl text-[17px] font-bold",
  outline: "h-12 rounded-[14px] border text-sm font-medium",
};

const enabledColors: Record<Variant, string> = {
  primary: "bg-gold text-on-gold active:bg-gold-dark",
  outline: "border-line text-ink active:bg-card-2",
};

const disabledColors: Record<Variant, string> = {
  primary: "bg-disabled text-muted cursor-not-allowed",
  outline: "border-line bg-disabled text-muted cursor-not-allowed",
};

function classesFor(variant: Variant, disabled: boolean, className?: string) {
  return [
    base,
    sizes[variant],
    disabled ? disabledColors[variant] : enabledColors[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * 공통 버튼. href를 주면 Next Link로, 아니면 <button type="button">으로 렌더한다.
 * - primary: 금색 배경, 높이 56, radius 16, 17px 굵게
 * - outline: line 테두리, 높이 48, radius 14, 14px
 * - disabled: disabled 배경 + muted 글자. 링크면 이동하지 않는 <span>으로 렌더한다.
 */
export function Button({
  variant = "primary",
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = classesFor(variant, disabled, className);

  if (rest.href !== undefined) {
    if (disabled) {
      return (
        <span role="link" aria-disabled="true" className={classes}>
          {children}
        </span>
      );
    }
    const { href, ...linkProps } = rest;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest;
  return (
    <button type={type} disabled={disabled} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

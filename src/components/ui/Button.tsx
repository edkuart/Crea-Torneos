// RSC — no "use client" needed
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "outline" | "warning" | "ghost-dark" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-md font-bold " +
  "transition focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-base",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong " +
    "focus-visible:ring-4 focus-visible:ring-brand/30",
  dark:
    "bg-ink text-white hover:bg-stone-800 " +
    "focus-visible:ring-4 focus-visible:ring-brand/30",
  outline:
    "border border-border bg-white text-ink hover:border-stone-500 " +
    "focus-visible:ring-4 focus-visible:ring-brand/20",
  warning:
    "bg-warning font-black text-ink hover:bg-warning-strong " +
    "focus-visible:ring-4 focus-visible:ring-amber-500/40",
  "ghost-dark":
    "border border-white/30 bg-white/10 font-black text-white " +
    "hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-amber-200/40",
  link:
    "border border-border bg-white font-bold text-stone-800 " +
    "hover:border-stone-500 focus-visible:ring-4 focus-visible:ring-brand/20",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "lg",
  fullWidth = false,
  extra = "",
) {
  return [base, sizes[size], variants[variant], fullWidth ? "w-full" : "", extra]
    .filter(Boolean)
    .join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  type = "button",
  className = "",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, fullWidth, className)}
      {...props}
    />
  );
}

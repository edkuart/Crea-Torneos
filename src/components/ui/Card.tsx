// RSC — no "use client" needed
import type { HTMLAttributes } from "react";

type Variant = "default" | "dark" | "warning";
type Padding = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  default: "border border-border-soft bg-white text-ink shadow-sm",
  dark: "border border-stone-800 bg-ink text-white",
  warning:
    "border border-warning-strong text-ink bg-gradient-to-b from-amber-50 to-white",
};

const pad: Record<Padding, string> = { sm: "p-4", md: "p-5", lg: "p-6" };

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  padding?: Padding;
};

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  ...props
}: Props) {
  return (
    <div
      className={["rounded-lg", variants[variant], pad[padding], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

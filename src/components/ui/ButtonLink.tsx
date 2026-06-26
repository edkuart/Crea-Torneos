// Mismo aspecto que Button pero renderiza <Link> de Next.js.
// Útil para CTAs que son enlaces de navegación.
import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClass } from "./Button";

type Variant = "primary" | "dark" | "outline" | "warning" | "ghost-dark" | "link";
type Size = "sm" | "md" | "lg";

type Props = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function ButtonLink({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className = "",
  ...props
}: Props) {
  return (
    <Link className={buttonClass(variant, size, fullWidth, className)} {...props} />
  );
}

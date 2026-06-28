"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./Button";

type Variant = "primary" | "dark" | "outline" | "warning" | "ghost-dark" | "link";
type Size = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  pendingLabel?: string;
  className?: string;
};

/**
 * Botón de envío que refleja el estado pending del formulario contenedor
 * (useFormStatus): se deshabilita y muestra un texto de progreso mientras la
 * server action está en curso.
 */
export function SubmitButton({
  children,
  variant = "primary",
  size = "lg",
  fullWidth = false,
  pendingLabel = "Procesando…",
  className = "",
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={buttonClass(variant, size, fullWidth, className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

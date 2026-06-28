"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionState } from "@/modules/tournaments/validation";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  action: Action;
  children: ReactNode;
  className?: string;
};

/**
 * Envuelve un formulario con useActionState para mostrar el error de la server
 * action inline, sin salir de la página ni perder el contexto del usuario.
 * El error se renderiza justo después del contenido (típicamente bajo el botón).
 */
export function ActionForm({ action, children, className = "" }: Props) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

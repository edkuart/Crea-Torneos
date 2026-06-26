// RSC — no "use client" needed
import type { ReactNode } from "react";

type Status = "active" | "withdrawn" | "absent";

const statusMap: Record<Status, { cls: string; label: string }> = {
  active:    { cls: "bg-active-bg text-active-fg",       label: "Activo" },
  withdrawn: { cls: "bg-withdrawn-bg text-withdrawn-fg", label: "Retirado" },
  absent:    { cls: "bg-absent-bg text-absent-fg",       label: "Ausente" },
};

export function Badge({
  status,
  children,
}: {
  status: Status;
  children?: ReactNode;
}) {
  const { cls, label } = statusMap[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold " + cls
      }
    >
      <span aria-hidden className="size-2 rounded-full bg-current opacity-70" />
      {children ?? label}
    </span>
  );
}

export function Eyebrow({
  dark,
  children,
}: {
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={
        "text-sm font-bold uppercase tracking-[0.18em] " +
        (dark ? "text-amber-200" : "text-brand")
      }
    >
      {children}
    </p>
  );
}

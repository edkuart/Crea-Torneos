"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function Collapsible({
  id,
  title,
  count,
  defaultOpen = true,
  className = "",
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`collapsible:${id}`);
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
    setHydrated(true);
  }, [id]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(`collapsible:${id}`, String(next));
  }

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-lg border border-border-soft bg-white px-5 py-4 text-left shadow-sm transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        aria-expanded={isOpen}
        type="button"
      >
        <span className="text-xl font-black">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-base font-semibold text-stone-500">({count})</span>
          )}
        </span>
        <svg
          aria-hidden
          className={`size-5 shrink-0 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Render children during SSR (hydrated=false) to avoid layout shift */}
      <div
        className={hydrated && !isOpen ? "hidden" : "mt-3"}
      >
        {children}
      </div>
    </div>
  );
}

"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-base font-bold text-white hover:bg-stone-800 print:hidden"
    >
      Imprimir
    </button>
  );
}

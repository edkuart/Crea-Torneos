"use client";

import { useState } from "react";

type ShareTournamentActionsProps = {
  publicCode: string;
  title: string;
};

export function ShareTournamentActions({
  publicCode,
  title,
}: ShareTournamentActionsProps) {
  const [copyLabel, setCopyLabel] = useState("Copiar enlace");

  const tournamentPath = `/torneos/${publicCode}`;

  function getTournamentUrl() {
    return `${window.location.origin}${tournamentPath}`;
  }

  function getShareText() {
    return `${title} (${publicCode}) - ${getTournamentUrl()}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getTournamentUrl());
      setCopyLabel("Enlace copiado");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    } catch {
      setCopyLabel("No se pudo copiar");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    }
  }

  function shareOnWhatsapp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(getShareText())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="mt-5 grid gap-2">
      <button
        className="min-h-12 rounded-md bg-amber-300 px-4 text-base font-black text-stone-950 hover:bg-amber-200"
        onClick={copyLink}
        type="button"
      >
        {copyLabel}
      </button>
      <button
        className="min-h-12 rounded-md border border-white/20 bg-white/10 px-4 text-base font-black text-white hover:bg-white/15"
        onClick={shareOnWhatsapp}
        type="button"
      >
        Compartir por WhatsApp
      </button>
    </div>
  );
}

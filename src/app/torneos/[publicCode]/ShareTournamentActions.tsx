"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

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
      <Button variant="warning" size="md" fullWidth onClick={copyLink}>
        {copyLabel}
      </Button>
      <Button variant="ghost-dark" size="md" fullWidth onClick={shareOnWhatsapp}>
        Compartir por WhatsApp
      </Button>
    </div>
  );
}

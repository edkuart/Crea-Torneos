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

  function getTournamentUrl() {
    return `${window.location.origin}/torneos/${publicCode}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getTournamentUrl());
      setCopyLabel("Copiado ✓");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    } catch {
      setCopyLabel("Error");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    }
  }

  function shareOnWhatsapp() {
    const text = `${title} (${publicCode}) - ${getTournamentUrl()}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={copyLink}>
        {copyLabel}
      </Button>
      <Button variant="outline" size="sm" onClick={shareOnWhatsapp}>
        WhatsApp
      </Button>
    </div>
  );
}

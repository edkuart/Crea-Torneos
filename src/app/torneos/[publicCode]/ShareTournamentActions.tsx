"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  const [showQr, setShowQr] = useState(false);
  const [url, setUrl] = useState("");

  // La URL absoluta solo existe en el cliente (window).
  useEffect(() => {
    setUrl(`${window.location.origin}/torneos/${publicCode}`);
  }, [publicCode]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Copiado ✓");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    } catch {
      setCopyLabel("Error");
      window.setTimeout(() => setCopyLabel("Copiar enlace"), 2200);
    }
  }

  function shareOnWhatsapp() {
    const text = `${title} (${publicCode}) - ${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copyLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={shareOnWhatsapp}>
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQr((value) => !value)}
          aria-expanded={showQr}
        >
          {showQr ? "Ocultar QR" : "QR"}
        </Button>
      </div>

      {showQr && url ? (
        <div className="rounded-lg border border-border bg-white p-4 text-center shadow-sm">
          <QRCodeSVG value={url} size={176} marginSize={2} level="M" />
          <p className="mt-2 text-sm font-bold text-stone-700">Escanea para abrir</p>
          <p className="text-xs font-semibold text-stone-400">{publicCode}</p>
        </div>
      ) : null}
    </div>
  );
}

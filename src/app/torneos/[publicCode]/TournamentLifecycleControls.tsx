"use client";

import {
  closeTournamentAction,
  reopenTournamentAction,
} from "@/app/actions/tournaments";
import { Button } from "@/components/ui";

type TournamentLifecycleControlsProps = {
  publicCode: string;
  status: string;
  pendingResults: number;
  hasRounds: boolean;
};

export function TournamentLifecycleControls({
  publicCode,
  status,
  pendingResults,
  hasRounds,
}: TournamentLifecycleControlsProps) {
  if (status === "closed") {
    return (
      <form
        action={reopenTournamentAction}
        className="mt-5"
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Reabrir el torneo permitira generar rondas y cambiar resultados de nuevo. El podio dejara de ser definitivo. Continuar?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input name="publicCode" type="hidden" value={publicCode} />
        <Button variant="ghost-dark" size="md" type="submit" fullWidth>
          Reabrir torneo
        </Button>
      </form>
    );
  }

  if (status === "cancelled") {
    return null;
  }

  if (!hasRounds) {
    return (
      <p className="mt-5 rounded-md bg-white/10 p-3 text-sm font-bold text-stone-200">
        Genera al menos una ronda para poder cerrar el torneo.
      </p>
    );
  }

  if (pendingResults > 0) {
    return (
      <p className="mt-5 rounded-md bg-white/10 p-3 text-sm font-bold text-stone-200">
        Carga los {pendingResults} resultado(s) pendientes para poder cerrar el torneo.
      </p>
    );
  }

  return (
    <form
      action={closeTournamentAction}
      className="mt-5"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Cerrar el torneo congela la tabla y muestra el podio final. No podras cambiar resultados ni jugadores sin reabrirlo. Continuar?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="publicCode" type="hidden" value={publicCode} />
      <Button variant="warning" size="md" type="submit" fullWidth>
        Cerrar torneo
      </Button>
    </form>
  );
}

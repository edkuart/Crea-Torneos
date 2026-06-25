"use client";

import {
  closeTournamentAction,
  reopenTournamentAction,
} from "@/app/actions/tournaments";

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
        <button
          className="min-h-12 w-full rounded-md border border-white/30 bg-white/10 px-4 text-base font-black text-white hover:bg-white/20"
          type="submit"
        >
          Reabrir torneo
        </button>
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
        Carga los {pendingResults} resultado(s) pendientes para poder cerrar el
        torneo.
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
      <button
        className="min-h-12 w-full rounded-md bg-amber-300 px-4 text-base font-black text-stone-950 hover:bg-amber-200"
        type="submit"
      >
        Cerrar torneo
      </button>
    </form>
  );
}

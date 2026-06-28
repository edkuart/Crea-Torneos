import { toEngineTournament } from "@/modules/tournaments/adapters";
import { normalizePublicCode } from "@/modules/tournaments/codes";
import { getTournamentByCode } from "@/modules/tournaments/queries";
import {
  calculateStandings,
  getStandingTiebreakValue,
} from "@/modules/tournaments/standings";
import { formatTiebreakLabel, readTiebreaks } from "@/modules/tournaments/tiebreaks";

function csvField(value: string | number): string {
  const text = String(value);
  // Entrecomilla si contiene coma, comilla o salto de línea; duplica comillas.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

type RouteContext = {
  params: Promise<{ publicCode: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { publicCode } = await params;
  const normalizedCode = normalizePublicCode(publicCode);
  const tournament = await getTournamentByCode(normalizedCode);

  if (!tournament) {
    return new Response("Torneo no encontrado.", { status: 404 });
  }

  const engineTournament = toEngineTournament(tournament);
  const selectedTiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, selectedTiebreaks);
  const exportTiebreaks = selectedTiebreaks.filter((code) => code !== "direct_encounter");

  const header = [
    "Puesto",
    "Jugador",
    "Puntos",
    "PJ",
    "G",
    "E",
    "P",
    "Byes",
    ...exportTiebreaks.map((code) => formatTiebreakLabel(code)),
  ];

  const rows = standings.map((standing, index) => [
    index + 1,
    standing.name,
    standing.points,
    standing.played,
    standing.wins,
    standing.draws,
    standing.losses,
    standing.byes,
    ...exportTiebreaks.map((code) => getStandingTiebreakValue(standing, code)),
  ]);

  // BOM para que Excel interprete UTF-8 (acentos) correctamente.
  const csv =
    "﻿" +
    [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${normalizedCode}-posiciones.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

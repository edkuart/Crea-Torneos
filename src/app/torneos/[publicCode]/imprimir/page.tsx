import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toEngineTournament } from "@/modules/tournaments/adapters";
import { normalizePublicCode } from "@/modules/tournaments/codes";
import { getTournamentByCode } from "@/modules/tournaments/queries";
import { formatGameResult, groupGamesByBoard } from "@/modules/tournaments/scoring";
import {
  calculateStandings,
  getStandingTiebreakValue,
} from "@/modules/tournaments/standings";
import { formatTiebreakLabel, readTiebreaks } from "@/modules/tournaments/tiebreaks";
import { PrintButton } from "./PrintButton";

type PrintPageProps = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { publicCode } = await params;
  return {
    title: `Imprimir ${normalizePublicCode(publicCode)} | Crea Torneos`,
    robots: { index: false, follow: false },
  };
}

function formatSystem(system: string) {
  return system === "round_robin" ? "Todos contra todos" : "Sistema suizo";
}

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatStandingNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function playerName(player?: { name: string } | null, fallback = "BYE") {
  return player?.name ?? fallback;
}

export default async function PrintPage({ params }: PrintPageProps) {
  const { publicCode } = await params;
  const normalizedCode = normalizePublicCode(publicCode);
  const tournament = await getTournamentByCode(normalizedCode);

  if (!tournament) notFound();

  const engineTournament = toEngineTournament(tournament);
  const selectedTiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, selectedTiebreaks);
  const printableTiebreaks = selectedTiebreaks.filter((code) => code !== "direct_encounter");
  const lastRound = tournament.rounds.at(-1);
  const generatedAt = formatDate(new Date());

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-black print:max-w-none print:p-0">
      {/* Barra de acciones — solo en pantalla */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/torneos/${tournament.publicCode}`}
          className="text-base font-bold text-stone-600 underline hover:text-black"
        >
          ← Volver al torneo
        </Link>
        <PrintButton />
      </div>

      {/* Encabezado */}
      <header className="border-b-2 border-black pb-3">
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-stone-600">
          {tournament.publicCode}
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight">{tournament.title}</h1>
        <p className="mt-1 text-sm font-semibold text-stone-700">
          {formatSystem(tournament.system)} · Ronda {tournament.currentRoundNumber}/
          {tournament.roundsPlanned} · {tournament.players.length} jugadores
          {tournament.gamesPerMatch >= 2 ? " · Ida y vuelta" : ""}
        </p>
      </header>

      {/* Pareos de la última ronda */}
      {lastRound ? (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-xl font-black">Pareos · Ronda {lastRound.roundNumber}</h2>
          <table className="mt-2 w-full border-collapse text-base">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="w-16 py-1 pr-2 font-black">Mesa</th>
                <th className="py-1 pr-2 font-black">Blancas</th>
                <th className="w-28 py-1 px-2 text-center font-black">Resultado</th>
                <th className="py-1 pl-2 font-black">Negras</th>
              </tr>
            </thead>
            <tbody>
              {groupGamesByBoard(lastRound.games).flatMap(([boardNumber, boardGames]) =>
                boardGames.map((game, legIndex) => (
                  <tr
                    className={`border-b border-stone-400 ${
                      legIndex === 0 ? "border-t border-black" : ""
                    }`}
                    key={game.id}
                  >
                    <td className="py-1.5 pr-2 font-bold">
                      {legIndex === 0 ? boardNumber : ""}
                    </td>
                    <td className="py-1.5 pr-2">{playerName(game.whitePlayer)}</td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      {game.result === "unplayed" ? "____" : formatGameResult(game.result)}
                    </td>
                    <td className="py-1.5 pl-2">{playerName(game.blackPlayer)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Tabla de posiciones */}
      <section className="mt-8 break-inside-avoid">
        <h2 className="text-xl font-black">Tabla de posiciones</h2>
        <table className="mt-2 w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="w-12 py-1 pr-2 font-black">#</th>
              <th className="py-1 pr-2 font-black">Jugador</th>
              <th className="w-16 py-1 px-2 text-center font-black">Pts</th>
              <th className="w-24 py-1 px-2 text-center font-black">G-E-P</th>
              {printableTiebreaks.map((code) => (
                <th className="w-20 py-1 px-2 text-center font-black" key={code}>
                  {formatTiebreakLabel(code)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr className="border-b border-stone-400" key={standing.playerId}>
                <td className="py-1.5 pr-2 font-bold">{index + 1}</td>
                <td className="py-1.5 pr-2">{standing.name}</td>
                <td className="py-1.5 px-2 text-center font-black">
                  {formatStandingNumber(standing.points)}
                </td>
                <td className="py-1.5 px-2 text-center">
                  {standing.wins}-{standing.draws}-{standing.losses}
                </td>
                {printableTiebreaks.map((code) => (
                  <td className="py-1.5 px-2 text-center" key={code}>
                    {formatStandingNumber(getStandingTiebreakValue(standing, code))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 border-t border-stone-400 pt-2 text-xs text-stone-500">
        Generado el {generatedAt} · Crea Torneos
      </footer>
    </main>
  );
}

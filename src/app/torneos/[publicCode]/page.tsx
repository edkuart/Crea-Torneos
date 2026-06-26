import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  addPlayerAction,
  deletePlayerAction,
  generateNextRoundAction,
  recordResultAction,
  setPlayerStatusAction,
  unlockOrganizerAction,
  updatePlayerNameAction,
} from "@/app/actions/tournaments";
import { Badge, Button, ButtonLink, Card, Collapsible, Eyebrow, Input } from "@/components/ui";
import { verifyToken } from "@/lib/security";
import { toEngineTournament } from "@/modules/tournaments/adapters";
import { normalizePublicCode, organizerCookieName } from "@/modules/tournaments/codes";
import { getTournamentByCode } from "@/modules/tournaments/queries";
import { formatGameResult } from "@/modules/tournaments/scoring";
import { calculateStandings, getNextRoundBlocker } from "@/modules/tournaments/standings";
import { formatTiebreakLabel, readTiebreaks } from "@/modules/tournaments/tiebreaks";
import { ShareTournamentActions } from "./ShareTournamentActions";
import { TournamentLifecycleControls } from "./TournamentLifecycleControls";

type TournamentPageProps = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
  const { publicCode } = await params;
  return {
    title: `${normalizePublicCode(publicCode)} | Crea Torneos`,
    robots: { index: false, follow: false },
  };
}

function formatSystem(system: string) {
  return system === "round_robin" ? "Todos contra todos" : "Sistema suizo";
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    setup: "Preparacion",
    active: "Activo",
    closed: "Cerrado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    paired: "Pareada",
    in_progress: "En juego",
    completed: "Completada",
    locked: "Bloqueada",
    active_player: "Activo",
    withdrawn: "Retirado",
    absent: "Ausente",
  };
  return labels[status] ?? status;
}

function playerName(player?: { name: string } | null, fallback = "BYE") {
  return player?.name ?? fallback;
}

function formatStandingNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getStandingTiebreakValue(
  standing: ReturnType<typeof calculateStandings>[number],
  code: ReturnType<typeof readTiebreaks>[number],
) {
  switch (code) {
    case "buchholz_cut_1":   return standing.buchholzCut1;
    case "buchholz":         return standing.buchholz;
    case "median_buchholz":  return standing.medianBuchholz;
    case "progressive":      return standing.progressive;
    case "sonneborn_berger": return standing.sonnebornBerger;
    case "wins":             return standing.wins;
    case "black_wins":       return standing.blackWins;
    case "direct_encounter": return 0;
  }
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { publicCode } = await params;
  const normalizedCode = normalizePublicCode(publicCode);
  const tournament = await getTournamentByCode(normalizedCode);

  if (!tournament) notFound();

  const cookieStore = await cookies();
  const organizerToken = cookieStore.get(organizerCookieName(tournament.publicCode))?.value;
  const canEdit = organizerToken
    ? verifyToken(organizerToken, tournament.organizerTokenHash) ||
      tournament.organizerSessions.some((s) => verifyToken(organizerToken, s.tokenHash))
    : false;

  const engineTournament = toEngineTournament(tournament);
  const selectedTiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, selectedTiebreaks);
  const nextRoundBlocker = getNextRoundBlocker(engineTournament);
  const primaryTiebreak = selectedTiebreaks[0];

  const standingsByPlayer = new Map(standings.map((s) => [s.playerId, s]));
  const playersWithGames = new Set(
    tournament.rounds.flatMap((r) =>
      r.games.flatMap((g) =>
        [g.whitePlayerId, g.blackPlayerId].filter((id): id is string => Boolean(id)),
      ),
    ),
  );

  const isClosed = tournament.status === "closed";
  const isFrozen = isClosed || tournament.status === "cancelled";
  const canManagePlayers = canEdit && !isFrozen;

  const lastRound = tournament.rounds.at(-1);
  const previousRounds = tournament.rounds.slice(0, -1);
  const pendingResults = lastRound?.games.filter((g) => g.result === "unplayed").length ?? 0;

  const podium = standings.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  const pairingWarningsByRound = new Map<number, string[]>();
  for (const attempt of tournament.pairingAttempts) {
    if (pairingWarningsByRound.has(attempt.roundNumber)) continue;
    const warnings = Array.isArray(attempt.warningsJson)
      ? (attempt.warningsJson as Array<{ message?: string }>)
          .map((w) => w?.message)
          .filter((m): m is string => Boolean(m))
      : [];
    pairingWarningsByRound.set(attempt.roundNumber, warnings);
  }

  const statusColor = isClosed
    ? "text-amber-700 font-bold"
    : tournament.status === "active"
      ? "text-brand font-bold"
      : "text-stone-600 font-semibold";

  return (
    <main className="min-h-screen bg-surface text-ink">

      {/* ── CABECERA COMPACTA ─────────────────────────────── */}
      <header className="border-b border-border-soft bg-white px-5 py-4 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ButtonLink href="/" variant="link" size="sm">
            ← Inicio
          </ButtonLink>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>{tournament.publicCode}</Eyebrow>
                {canEdit && (
                  <span className="inline-flex items-center rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">
                    Organizador
                  </span>
                )}
              </div>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">
                {tournament.title}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-stone-600">
                <span>{formatSystem(tournament.system)}</span>
                <span className="text-stone-300">·</span>
                <span>
                  Ronda {tournament.currentRoundNumber}/{tournament.roundsPlanned}
                </span>
                <span className="text-stone-300">·</span>
                <span>{tournament.players.length} jugadores</span>
                <span className="text-stone-300">·</span>
                <span className={statusColor}>{formatStatus(tournament.status)}</span>
                {tournament.startsAt && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span>{formatDate(tournament.startsAt)}</span>
                  </>
                )}
              </p>
            </div>
            <div className="shrink-0">
              <ShareTournamentActions
                publicCode={tournament.publicCode}
                title={tournament.title}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8">

        {/* ── PODIO (si cerrado) ───────────────────────────── */}
        {isClosed && podium.length > 0 ? (
          <section className="mb-6 rounded-lg border border-warning-strong bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
            <Eyebrow>Torneo cerrado</Eyebrow>
            <h2 className="mt-2 text-3xl font-black">Podio final</h2>
            <p className="mt-1 text-base font-semibold text-stone-600">
              Tabla congelada{tournament.closedAt ? ` el ${formatDate(tournament.closedAt)}` : ""}.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {podium.map((standing, index) => (
                <div
                  key={standing.playerId}
                  className={`rounded-lg border-2 p-4 text-center ${
                    index === 0
                      ? "border-amber-300 bg-amber-50"
                      : index === 1
                        ? "border-stone-300 bg-stone-50"
                        : "border-orange-200 bg-orange-50"
                  }`}
                >
                  <p className="text-4xl">{medals[index]}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-wide text-stone-500">
                    {index + 1}º lugar
                  </p>
                  <p className="mt-2 text-xl font-black leading-tight">{standing.name}</p>
                  <p className="mt-1 text-base font-bold text-brand">
                    {formatStandingNumber(standing.points)} puntos
                  </p>
                  {primaryTiebreak ? (
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      {formatTiebreakLabel(primaryTiebreak)}:{" "}
                      {formatStandingNumber(getStandingTiebreakValue(standing, primaryTiebreak))}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── GRID PRINCIPAL: Tabla | Rondas ──────────────── */}
        <section className="grid gap-5 lg:grid-cols-[380px_1fr]">

          {/* Tabla (siempre visible) */}
          <Card className="self-start">
            <h2 className="text-2xl font-black">Tabla</h2>
            {primaryTiebreak ? (
              <p className="mt-1 text-sm font-bold text-stone-500">
                Por puntos y {formatTiebreakLabel(primaryTiebreak)}.
              </p>
            ) : null}
            <div className="mt-4 divide-y divide-border-soft">
              {standings.map((standing, index) => (
                <div
                  key={standing.playerId}
                  className="grid grid-cols-[44px_1fr_56px] items-center gap-3 py-3"
                >
                  <span className="rounded-md bg-active-bg px-3 py-2 text-center text-base font-black text-active-fg">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-lg font-bold">{standing.name}</p>
                    <p className="text-sm font-semibold text-stone-500">
                      {standing.wins}G · {standing.draws}E · {standing.losses}P
                    </p>
                    {primaryTiebreak ? (
                      <p className="text-sm font-semibold text-stone-500">
                        {formatTiebreakLabel(primaryTiebreak)}:{" "}
                        {formatStandingNumber(getStandingTiebreakValue(standing, primaryTiebreak))}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-right text-2xl font-black text-brand">
                    {standing.points}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Columna de rondas */}
          <div className="grid gap-4 self-start">

            {tournament.rounds.length === 0 ? (
              <Card>
                <h2 className="text-2xl font-black">Rondas</h2>
                <p className="mt-1 text-base leading-7 text-stone-700">
                  Pareos y resultados visibles para todos.
                </p>
                {canEdit && !isFrozen ? (
                  <>
                    <form action={generateNextRoundAction} className="mt-4">
                      <input name="publicCode" type="hidden" value={tournament.publicCode} />
                      <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        disabled={Boolean(nextRoundBlocker)}
                      >
                        Generar primera ronda
                      </Button>
                    </form>
                    {nextRoundBlocker ? (
                      <p className="mt-3 rounded-md bg-amber-50 p-3 text-base font-bold text-amber-950">
                        {nextRoundBlocker}
                      </p>
                    ) : null}
                  </>
                ) : null}
                <div className="mt-5 rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                  <p className="text-lg font-bold text-stone-700">
                    Todavia no hay rondas. Cuando generes la primera, quedara guardada en la base
                    de datos.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Ronda actual — abierta */}
                {lastRound ? (
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Eyebrow>
                          {isFrozen ? "Última ronda" : "Ronda en curso"}
                        </Eyebrow>
                        <h2 className="mt-1 text-2xl font-black">
                          Ronda {lastRound.roundNumber}
                          <span className="ml-2 text-base font-semibold text-stone-500">
                            {formatStatus(lastRound.status)}
                          </span>
                        </h2>
                      </div>
                      {canEdit && !isFrozen ? (
                        <form action={generateNextRoundAction}>
                          <input name="publicCode" type="hidden" value={tournament.publicCode} />
                          <Button
                            variant="primary"
                            size="md"
                            type="submit"
                            disabled={Boolean(nextRoundBlocker)}
                          >
                            Ronda {lastRound.roundNumber + 1} →
                          </Button>
                        </form>
                      ) : null}
                    </div>

                    {nextRoundBlocker && canEdit && !isFrozen ? (
                      <p className="mt-3 rounded-md bg-amber-50 p-3 text-base font-bold text-amber-950">
                        {nextRoundBlocker}
                      </p>
                    ) : null}

                    {(pairingWarningsByRound.get(lastRound.roundNumber)?.length ?? 0) > 0 ? (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-black text-amber-900">
                          Notas del pareo automatico
                        </p>
                        <ul className="mt-1 grid gap-1">
                          {pairingWarningsByRound.get(lastRound.roundNumber)?.map((msg, i) => (
                            <li className="text-sm font-semibold leading-6 text-amber-900" key={i}>
                              {msg}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-4 divide-y divide-stone-200">
                      {lastRound.games.map((game) => (
                        <div className="grid gap-3 py-4" key={game.id}>
                          <div className="grid gap-2 text-base sm:grid-cols-[72px_1fr_96px] sm:items-center">
                            <span className="font-black text-stone-500">
                              Mesa {game.boardNumber}
                            </span>
                            <span className="font-bold">
                              {playerName(game.whitePlayer)} vs{" "}
                              {playerName(game.blackPlayer)}
                            </span>
                            <span className="rounded-md bg-stone-50 px-3 py-2 text-center font-black text-brand">
                              {formatGameResult(game.result)}
                            </span>
                          </div>
                          {canEdit && !isFrozen && !game.isBye ? (
                            <div className="grid grid-cols-3 gap-2 sm:flex">
                              {(
                                [
                                  ["white_win", "1-0"],
                                  ["draw", "½-½"],
                                  ["black_win", "0-1"],
                                ] as [string, string][]
                              ).map(([result, label]) => {
                                const isSelected = game.result === result;
                                return (
                                  <form action={recordResultAction} key={result}>
                                    <input
                                      name="publicCode"
                                      type="hidden"
                                      value={tournament.publicCode}
                                    />
                                    <input name="gameId" type="hidden" value={game.id} />
                                    <input name="result" type="hidden" value={result} />
                                    <button
                                      aria-pressed={isSelected}
                                      className={`min-h-11 w-full rounded-md border px-4 text-base font-black sm:w-auto ${
                                        isSelected
                                          ? "border-brand bg-brand text-white"
                                          : "border-border bg-white text-ink hover:border-brand"
                                      }`}
                                      type="submit"
                                    >
                                      {label}
                                    </button>
                                  </form>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {/* Rondas anteriores — colapsadas individualmente */}
                {previousRounds.length > 0 ? (
                  <Collapsible
                    id={`${tournament.publicCode}-prev-rounds`}
                    title="Rondas anteriores"
                    count={previousRounds.length}
                    defaultOpen={false}
                  >
                    <div className="grid gap-2">
                      {[...previousRounds].reverse().map((round) => (
                        <Collapsible
                          key={round.id}
                          id={`${tournament.publicCode}-round-${round.roundNumber}`}
                          title={`Ronda ${round.roundNumber}`}
                          defaultOpen={false}
                        >
                          {(pairingWarningsByRound.get(round.roundNumber)?.length ?? 0) > 0 ? (
                            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                              <p className="text-sm font-black text-amber-900">
                                Notas del pareo automatico
                              </p>
                              <ul className="mt-1 grid gap-1">
                                {pairingWarningsByRound
                                  .get(round.roundNumber)
                                  ?.map((msg, i) => (
                                    <li
                                      className="text-sm font-semibold leading-6 text-amber-900"
                                      key={i}
                                    >
                                      {msg}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ) : null}
                          <div className="divide-y divide-stone-200 rounded-lg border border-border-soft bg-white px-4">
                            {round.games.map((game) => (
                              <div
                                className="grid gap-2 py-3 text-sm sm:grid-cols-[56px_1fr_72px] sm:items-center"
                                key={game.id}
                              >
                                <span className="font-black text-stone-400">
                                  M{game.boardNumber}
                                </span>
                                <span className="font-semibold">
                                  {playerName(game.whitePlayer)} vs{" "}
                                  {playerName(game.blackPlayer)}
                                </span>
                                <span className="font-black text-brand">
                                  {formatGameResult(game.result)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  </Collapsible>
                ) : null}
              </>
            )}
          </div>
        </section>

        {/* ── JUGADORES (colapsado) ────────────────────────── */}
        <Collapsible
          id={`${tournament.publicCode}-players`}
          title="Jugadores"
          count={tournament.players.length}
          defaultOpen={false}
          className="mt-5"
        >
          <div className="grid gap-3">

            {/* Formulario agregar jugador */}
            {canManagePlayers ? (
              <Card>
                <h3 className="text-base font-black text-stone-700">Agregar jugador</h3>
                <form action={addPlayerAction} className="mt-3 flex gap-2">
                  <input name="publicCode" type="hidden" value={tournament.publicCode} />
                  <input
                    className="min-h-11 flex-1 rounded-md border border-border bg-white px-3 text-base text-ink outline-none placeholder:text-stone-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
                    name="playerName"
                    type="text"
                    placeholder="Nombre del jugador"
                    maxLength={60}
                    required
                    autoComplete="off"
                  />
                  <Button variant="dark" size="md" type="submit">
                    + Agregar
                  </Button>
                </form>
              </Card>
            ) : null}

            {/* Lista de jugadores */}
            <Card className="divide-y divide-border-soft p-0 overflow-hidden">
              {tournament.players.map((player) => {
                const standing = standingsByPlayer.get(player.id);
                const hasGames = playersWithGames.has(player.id);

                return (
                  <div key={player.id} className="px-5 py-4">
                    {/* Fila principal: siempre visible */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-base font-black text-stone-400">
                          #{player.seed}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black">{player.name}</p>
                          <p className="text-sm font-semibold text-stone-500">
                            {standing?.points ?? 0} pts ·{" "}
                            {standing?.wins ?? 0}G {standing?.draws ?? 0}E {standing?.losses ?? 0}P
                          </p>
                        </div>
                      </div>
                      <Badge status={player.status as "active" | "withdrawn" | "absent"} />
                    </div>

                    {/* Panel de edición — disclosure nativo (SSR, sin JS) */}
                    {canManagePlayers ? (
                      <details className="mt-3 group">
                        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-bold text-stone-500 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                          <svg
                            aria-hidden
                            className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-90"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Editar jugador
                        </summary>

                        <div className="mt-3 grid gap-3 rounded-lg border border-border-soft bg-stone-50 p-4">
                          {/* Cambiar nombre */}
                          <form action={updatePlayerNameAction} className="grid gap-2">
                            <input name="publicCode" type="hidden" value={tournament.publicCode} />
                            <input name="playerId" type="hidden" value={player.id} />
                            <label className="text-sm font-bold text-stone-700">
                              Nombre
                              <input
                                className="mt-1 min-h-10 w-full rounded-md border border-border bg-white px-3 text-base text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                                defaultValue={player.name}
                                maxLength={60}
                                name="playerName"
                                required
                                type="text"
                              />
                            </label>
                            <Button variant="outline" size="sm" type="submit" fullWidth>
                              Guardar nombre
                            </Button>
                          </form>

                          {/* Estado */}
                          <div>
                            <p className="mb-2 text-sm font-bold text-stone-700">Estado</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {player.status !== "active" ? (
                                <form action={setPlayerStatusAction} className="col-span-2 sm:col-span-1">
                                  <input name="publicCode" type="hidden" value={tournament.publicCode} />
                                  <input name="playerId" type="hidden" value={player.id} />
                                  <input name="status" type="hidden" value="active" />
                                  <Button variant="primary" size="sm" type="submit" fullWidth>
                                    Reactivar
                                  </Button>
                                </form>
                              ) : (
                                <>
                                  <form action={setPlayerStatusAction}>
                                    <input name="publicCode" type="hidden" value={tournament.publicCode} />
                                    <input name="playerId" type="hidden" value={player.id} />
                                    <input name="status" type="hidden" value="withdrawn" />
                                    <button
                                      className="min-h-10 w-full rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-black text-amber-950 hover:bg-amber-100"
                                      type="submit"
                                    >
                                      Retirar
                                    </button>
                                  </form>
                                  <form action={setPlayerStatusAction}>
                                    <input name="publicCode" type="hidden" value={tournament.publicCode} />
                                    <input name="playerId" type="hidden" value={player.id} />
                                    <input name="status" type="hidden" value="absent" />
                                    <Button variant="outline" size="sm" type="submit" fullWidth>
                                      Ausente
                                    </Button>
                                  </form>
                                </>
                              )}

                              {!hasGames ? (
                                <form action={deletePlayerAction}>
                                  <input name="publicCode" type="hidden" value={tournament.publicCode} />
                                  <input name="playerId" type="hidden" value={player.id} />
                                  <button
                                    className="min-h-10 w-full rounded-md border border-red-200 bg-white px-3 text-sm font-black text-red-700 hover:border-red-400 hover:bg-red-50"
                                    type="submit"
                                  >
                                    Eliminar
                                  </button>
                                </form>
                              ) : (
                                <span className="flex min-h-10 items-center justify-center rounded-md bg-stone-100 px-3 text-center text-xs font-bold text-stone-400">
                                  Tiene partidas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    ) : null}
                  </div>
                );
              })}
            </Card>

          </div>
        </Collapsible>

        {/* ── PANEL DEL ORGANIZADOR / ACCESO PIN ──────────── */}
        {canEdit ? (
          <Collapsible
            id={`${tournament.publicCode}-organizer`}
            title="Panel del organizador"
            defaultOpen={false}
            className="mt-4"
          >
            <aside className="rounded-lg border border-stone-800 bg-ink p-5 text-white">
              <Eyebrow dark>Acceso activo</Eyebrow>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Codigo del torneo:{" "}
                <span className="font-black text-white">{tournament.publicCode}</span>
              </p>
              <TournamentLifecycleControls
                publicCode={tournament.publicCode}
                status={tournament.status}
                pendingResults={pendingResults}
                hasRounds={tournament.rounds.length > 0}
              />
            </aside>
          </Collapsible>
        ) : (
          <Collapsible
            id={`${tournament.publicCode}-pin`}
            title="Acceder como organizador"
            defaultOpen={true}
            className="mt-4"
          >
            <aside className="rounded-lg border border-stone-800 bg-ink p-5 text-white">
              <form action={unlockOrganizerAction} className="grid gap-3">
                <input name="publicCode" type="hidden" value={tournament.publicCode} />
                <Input
                  dark
                  label="PIN de organizador"
                  name="organizerPin"
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  pattern="[0-9]{4,8}"
                  placeholder="1234"
                  required
                />
                <Button variant="warning" size="md" type="submit" fullWidth>
                  Desbloquear edicion
                </Button>
              </form>
            </aside>
          </Collapsible>
        )}

      </div>
    </main>
  );
}

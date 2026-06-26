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
import { Badge, Button, ButtonLink, Card, Eyebrow, Input } from "@/components/ui";
import { verifyToken } from "@/lib/security";
import { toEngineTournament } from "@/modules/tournaments/adapters";
import { normalizePublicCode, organizerCookieName } from "@/modules/tournaments/codes";
import { getTournamentByCode } from "@/modules/tournaments/queries";
import { formatGameResult } from "@/modules/tournaments/scoring";
import { calculateStandings, getNextRoundBlocker } from "@/modules/tournaments/standings";
import {
  formatTiebreakLabel,
  readTiebreaks,
} from "@/modules/tournaments/tiebreaks";
import { ShareTournamentActions } from "./ShareTournamentActions";
import { TournamentLifecycleControls } from "./TournamentLifecycleControls";

type TournamentPageProps = {
  params: Promise<{ publicCode: string }>;
};

export async function generateMetadata({
  params,
}: TournamentPageProps): Promise<Metadata> {
  const { publicCode } = await params;

  return {
    title: `${normalizePublicCode(publicCode)} | Crea Torneos`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function formatSystem(system: string) {
  return system === "round_robin" ? "Todos contra todos" : "Sistema suizo";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Sin fecha definida";
  }

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

function playerName(
  player?: { name: string } | null,
  fallback = "BYE",
) {
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
    case "buchholz_cut_1":
      return standing.buchholzCut1;
    case "buchholz":
      return standing.buchholz;
    case "median_buchholz":
      return standing.medianBuchholz;
    case "progressive":
      return standing.progressive;
    case "sonneborn_berger":
      return standing.sonnebornBerger;
    case "wins":
      return standing.wins;
    case "black_wins":
      return standing.blackWins;
    case "direct_encounter":
      return 0;
  }
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { publicCode } = await params;
  const normalizedCode = normalizePublicCode(publicCode);
  const tournament = await getTournamentByCode(normalizedCode);

  if (!tournament) {
    notFound();
  }

  const cookieStore = await cookies();
  const organizerToken = cookieStore.get(organizerCookieName(tournament.publicCode))?.value;
  const canEdit = organizerToken
    ? verifyToken(organizerToken, tournament.organizerTokenHash) ||
      tournament.organizerSessions.some((session) =>
        verifyToken(organizerToken, session.tokenHash),
      )
    : false;
  const engineTournament = toEngineTournament(tournament);
  const selectedTiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, selectedTiebreaks);
  const nextRoundBlocker = getNextRoundBlocker(engineTournament);
  const primaryTiebreak = selectedTiebreaks[0];
  const standingsByPlayer = new Map(
    standings.map((standing) => [standing.playerId, standing]),
  );
  const playersWithGames = new Set(
    tournament.rounds.flatMap((round) =>
      round.games.flatMap((game) =>
        [game.whitePlayerId, game.blackPlayerId].filter(
          (playerId): playerId is string => Boolean(playerId),
        ),
      ),
    ),
  );
  const isClosed = tournament.status === "closed";
  const isFrozen = isClosed || tournament.status === "cancelled";
  const canManagePlayers = canEdit && !isFrozen;
  const lastRound = tournament.rounds.at(-1);
  const pendingResults =
    lastRound?.games.filter((game) => game.result === "unplayed").length ?? 0;
  const podium = standings.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const pairingWarningsByRound = new Map<number, string[]>();
  for (const attempt of tournament.pairingAttempts) {
    if (pairingWarningsByRound.has(attempt.roundNumber)) {
      continue;
    }

    const warnings = Array.isArray(attempt.warningsJson)
      ? (attempt.warningsJson as Array<{ message?: string }>)
          .map((warning) => warning?.message)
          .filter((message): message is string => Boolean(message))
      : [];

    pairingWarningsByRound.set(attempt.roundNumber, warnings);
  }

  return (
    <main className="min-h-screen bg-[#f8f3e9] px-5 py-8 text-stone-950 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <ButtonLink href="/" variant="link" size="sm">
          Volver al inicio
        </ButtonLink>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <Eyebrow>{tournament.publicCode}</Eyebrow>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              {tournament.title}
            </h1>
            <p className="mt-4 text-xl leading-8 text-stone-700">
              {formatSystem(tournament.system)} · {tournament.roundsPlanned} rondas ·{" "}
              {tournament.players.length} jugadores
            </p>
            <p className="mt-3 text-base font-semibold leading-7 text-stone-600">
              Desempates:{" "}
              {selectedTiebreaks.map((code) => formatTiebreakLabel(code)).join(", ")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-stone-50 p-4">
                <p className="text-sm font-bold text-stone-500">Estado</p>
                <p className="mt-1 text-xl font-black">
                  {formatStatus(tournament.status)}
                </p>
              </div>
              <div className="rounded-md bg-stone-50 p-4">
                <p className="text-sm font-bold text-stone-500">Ronda actual</p>
                <p className="mt-1 text-xl font-black">{tournament.currentRoundNumber}</p>
              </div>
              <div className="rounded-md bg-stone-50 p-4">
                <p className="text-sm font-bold text-stone-500">Inicio</p>
                <p className="mt-1 text-base font-black">{formatDate(tournament.startsAt)}</p>
              </div>
            </div>
          </Card>

          <aside className="rounded-lg border border-stone-800 bg-ink p-5 text-white shadow-sm">
            <Eyebrow dark>Acceso</Eyebrow>
            <h2 className="mt-3 text-2xl font-black">
              {canEdit ? "Modo organizador" : "Vista publica"}
            </h2>
            <p className="mt-3 text-base leading-7 text-stone-200">
              {canEdit
                ? "Puedes compartir este enlace, generar rondas, guardar resultados y administrar jugadores."
                : "Los jugadores pueden ver este enlace sin modificar el torneo. Para editar, ingresa el PIN de organizador."}
            </p>
            <p className="mt-5 break-all rounded-md bg-white/10 p-3 text-sm font-bold">
              Codigo: {tournament.publicCode}
            </p>
            <ShareTournamentActions
              publicCode={tournament.publicCode}
              title={tournament.title}
            />
            {canEdit ? (
              <TournamentLifecycleControls
                publicCode={tournament.publicCode}
                status={tournament.status}
                pendingResults={pendingResults}
                hasRounds={tournament.rounds.length > 0}
              />
            ) : null}
            {!canEdit ? (
              <form action={unlockOrganizerAction} className="mt-5 grid gap-3">
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
            ) : null}
          </aside>
        </section>

        {isClosed && podium.length > 0 ? (
          <section className="mt-5 rounded-lg border border-warning-strong bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
            <Eyebrow>Torneo cerrado</Eyebrow>
            <h2 className="mt-2 text-3xl font-black">Podio final</h2>
            <p className="mt-1 text-base font-semibold text-stone-600">
              Tabla congelada{" "}
              {tournament.closedAt ? `el ${formatDate(tournament.closedAt)}` : ""}.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {podium.map((standing, index) => (
                <div
                  className={`rounded-lg border-2 p-4 text-center ${
                    index === 0
                      ? "border-amber-300 bg-amber-50"
                      : index === 1
                        ? "border-stone-300 bg-stone-50"
                        : "border-orange-200 bg-orange-50"
                  }`}
                  key={standing.playerId}
                >
                  <p className="text-4xl">{medals[index]}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-wide text-stone-500">
                    {index + 1}º lugar
                  </p>
                  <p className="mt-2 text-xl font-black leading-tight">
                    {standing.name}
                  </p>
                  <p className="mt-1 text-base font-bold text-emerald-800">
                    {formatStandingNumber(standing.points)} puntos
                  </p>
                  {primaryTiebreak ? (
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      {formatTiebreakLabel(primaryTiebreak)}:{" "}
                      {formatStandingNumber(
                        getStandingTiebreakValue(standing, primaryTiebreak),
                      )}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="grid gap-5">
            <Card>
              <h2 className="text-2xl font-black">Tabla</h2>
              {primaryTiebreak ? (
                <p className="mt-1 text-sm font-bold text-stone-500">
                  Ordenada por puntos y {formatTiebreakLabel(primaryTiebreak)}.
                </p>
              ) : null}
              <div className="mt-4 divide-y divide-stone-200">
                {standings.map((standing, index) => (
                  <div
                    className="grid grid-cols-[44px_1fr_64px] items-center gap-3 py-3"
                    key={standing.playerId}
                  >
                    <span className="rounded-md bg-active-bg px-3 py-2 text-center text-base font-black text-active-fg">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-lg font-bold">{standing.name}</p>
                      <p className="text-sm font-semibold capitalize text-stone-500">
                        {standing.wins}G · {standing.draws}E · {standing.losses}P
                      </p>
                      {primaryTiebreak ? (
                        <p className="text-sm font-semibold text-stone-500">
                          {formatTiebreakLabel(primaryTiebreak)}:{" "}
                          {formatStandingNumber(
                            getStandingTiebreakValue(standing, primaryTiebreak),
                          )}
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

            <Card>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Jugadores</h2>
                  <p className="mt-1 text-sm font-bold text-stone-500">
                    Lista publica con estado y puntaje actual.
                  </p>
                </div>
                <span className="rounded-md bg-stone-100 px-3 py-2 text-sm font-black text-stone-700">
                  {tournament.players.length}
                </span>
              </div>

              {canManagePlayers ? (
                <form action={addPlayerAction} className="mt-4 grid gap-2">
                  <input name="publicCode" type="hidden" value={tournament.publicCode} />
                  <Input
                    label="Agregar jugador"
                    name="playerName"
                    type="text"
                    placeholder="Nombre del jugador"
                    maxLength={60}
                    required
                  />
                  <Button variant="dark" size="md" type="submit" fullWidth>
                    Agregar
                  </Button>
                </form>
              ) : null}

              <div className="mt-4 divide-y divide-stone-200">
                {tournament.players.map((player) => {
                  const standing = standingsByPlayer.get(player.id);
                  const hasGames = playersWithGames.has(player.id);

                  return (
                    <div className="grid gap-3 py-4" key={player.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black">{player.name}</p>
                          <p className="mt-1 text-sm font-bold text-stone-500">
                            {standing?.points ?? 0} puntos · seed {player.seed}
                          </p>
                        </div>
                        <Badge status={player.status as "active" | "withdrawn" | "absent"} />
                      </div>

                      {canManagePlayers ? (
                        <div className="grid gap-2">
                          <form action={updatePlayerNameAction} className="grid gap-2">
                            <input
                              name="publicCode"
                              type="hidden"
                              value={tournament.publicCode}
                            />
                            <input name="playerId" type="hidden" value={player.id} />
                            <input
                              className="min-h-11 w-full rounded-md border border-border bg-white px-3 text-base text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                              defaultValue={player.name}
                              maxLength={60}
                              name="playerName"
                              required
                              type="text"
                            />
                            <Button variant="outline" size="sm" type="submit" fullWidth>
                              Guardar nombre
                            </Button>
                          </form>

                          <div className="grid grid-cols-2 gap-2">
                            {player.status !== "active" ? (
                              <form action={setPlayerStatusAction}>
                                <input
                                  name="publicCode"
                                  type="hidden"
                                  value={tournament.publicCode}
                                />
                                <input name="playerId" type="hidden" value={player.id} />
                                <input name="status" type="hidden" value="active" />
                                <Button variant="primary" size="sm" type="submit" fullWidth>
                                  Reactivar
                                </Button>
                              </form>
                            ) : (
                              <>
                                <form action={setPlayerStatusAction}>
                                  <input
                                    name="publicCode"
                                    type="hidden"
                                    value={tournament.publicCode}
                                  />
                                  <input name="playerId" type="hidden" value={player.id} />
                                  <input name="status" type="hidden" value="withdrawn" />
                                  <button
                                    className="min-h-11 w-full rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-black text-amber-950"
                                    type="submit"
                                  >
                                    Retirar
                                  </button>
                                </form>
                                <form action={setPlayerStatusAction}>
                                  <input
                                    name="publicCode"
                                    type="hidden"
                                    value={tournament.publicCode}
                                  />
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
                                <input
                                  name="publicCode"
                                  type="hidden"
                                  value={tournament.publicCode}
                                />
                                <input name="playerId" type="hidden" value={player.id} />
                                <button
                                  className="min-h-11 w-full rounded-md border border-red-200 bg-white px-3 text-sm font-black text-red-700"
                                  type="submit"
                                >
                                  Eliminar
                                </button>
                              </form>
                            ) : (
                              <span className="flex min-h-11 items-center justify-center rounded-md bg-stone-100 px-3 text-center text-sm font-black text-stone-500">
                                Con partidas
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Rondas</h2>
                <p className="mt-1 text-base leading-7 text-stone-700">
                  Pareos y resultados visibles para todos. La edicion aparece solo en
                  modo organizador.
                </p>
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
                    Generar ronda
                  </Button>
                </form>
              ) : null}
            </div>

            {nextRoundBlocker ? (
              <p className="mt-4 rounded-md bg-amber-50 p-3 text-base font-bold text-amber-950">
                {nextRoundBlocker}
              </p>
            ) : null}

            {tournament.rounds.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <p className="text-lg font-bold text-stone-700">
                  Todavia no hay rondas. Cuando generes la primera, quedara guardada
                  en la base de datos.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-5">
                {tournament.rounds.map((round) => (
                  <section
                    className="rounded-md border border-stone-200 bg-stone-50 p-4"
                    key={round.id}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-xl font-black">
                        Ronda {round.roundNumber}
                      </h3>
                      <p className="text-sm font-bold text-stone-500">
                        {formatStatus(round.status)}
                      </p>
                    </div>

                    {(pairingWarningsByRound.get(round.roundNumber)?.length ?? 0) > 0 ? (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-black text-amber-900">
                          Notas del pareo automatico
                        </p>
                        <ul className="mt-1 grid gap-1">
                          {pairingWarningsByRound
                            .get(round.roundNumber)
                            ?.map((message, index) => (
                              <li
                                className="text-sm font-semibold leading-6 text-amber-900"
                                key={index}
                              >
                                {message}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-3 divide-y divide-stone-200">
                      {round.games.map((game) => (
                        <div className="grid gap-3 py-4" key={game.id}>
                          <div className="grid gap-2 text-base sm:grid-cols-[72px_1fr_96px] sm:items-center">
                            <span className="font-black text-stone-500">
                              Mesa {game.boardNumber}
                            </span>
                            <span className="font-bold">
                              {playerName(game.whitePlayer)} vs{" "}
                              {playerName(game.blackPlayer)}
                            </span>
                            <span className="rounded-md bg-white px-3 py-2 text-center font-black text-brand">
                              {formatGameResult(game.result)}
                            </span>
                          </div>

                          {canEdit && !isFrozen && !game.isBye ? (
                            <div className="grid grid-cols-3 gap-2 sm:flex">
                              {[
                                ["white_win", "1-0"],
                                ["draw", "1/2"],
                                ["black_win", "0-1"],
                              ].map(([result, label]) => {
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
                  </section>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

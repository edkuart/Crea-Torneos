"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import {
  createSecretToken,
  hashSecret,
  hashToken,
  verifySecret,
  verifyToken,
} from "@/lib/security";
import { toEngineTournament } from "@/modules/tournaments/adapters";
import {
  createPublicCode,
  normalizePublicCode,
  organizerCookieName,
  organizerCookieOptions,
} from "@/modules/tournaments/codes";
import type { GameResult, PlayerStatus } from "@/modules/tournaments/engine-types";
import { generateNextRoundPreview } from "@/modules/tournaments/pairings";
import { getGameScores } from "@/modules/tournaments/scoring";
import {
  buildFinalStandingRows,
  calculateStandings,
  getColorBalance,
} from "@/modules/tournaments/standings";
import {
  formatAutomaticTournamentTitle,
  normalizeTiebreaks,
  readTiebreaks,
} from "@/modules/tournaments/tiebreaks";
import {
  type ActionState,
  createTournamentSchema,
  organizerPinSchema,
  playerIdSchema,
  playerNameSchema,
  playerStatusSchema,
  publicCodeSchema,
} from "@/modules/tournaments/validation";

const editableResults: GameResult[] = [
  "white_win",
  "black_win",
  "draw",
  "white_forfeit",
  "black_forfeit",
  "double_forfeit",
];

async function createUniquePublicCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const publicCode = createPublicCode();
    const existing = await db().tournament.findUnique({
      where: { publicCode },
      select: { id: true },
    });

    if (!existing) {
      return publicCode;
    }
  }

  throw new Error("No se pudo generar un codigo unico. Intenta de nuevo.");
}

export async function createTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createTournamentSchema.safeParse({
    title: formData.get("title"),
    system: formData.get("system"),
    tiebreaks: formData.getAll("tiebreaks"),
    roundsPlanned: formData.get("roundsPlanned"),
    gamesPerMatch: formData.get("gamesPerMatch"),
    organizerPin: formData.get("organizerPin"),
    playerNames: formData.get("playerNames"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const publicCode = await createUniquePublicCode();
  const organizerToken = createSecretToken();
  const { organizerPin, playerNames, title, ...tournamentInput } = parsed.data;
  const tiebreaks = normalizeTiebreaks(tournamentInput.tiebreaks, tournamentInput.system);

  // Round robin tiene un calendario determinista: cada jugador enfrenta a todos
  // los demas una vez por ronda. En ida y vuelta ambos duelos se juegan en la
  // misma mesa dentro de la misma ronda, así que el número de rondas no cambia.
  if (tournamentInput.system === "round_robin") {
    const playerCount = playerNames.length;
    tournamentInput.roundsPlanned = playerCount % 2 === 0 ? playerCount - 1 : playerCount;
  }

  await db().$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        ...tournamentInput,
        title: title ?? "Torneo nuevo",
        tiebreaks,
        publicCode,
        organizerPinHash: hashSecret(organizerPin),
        organizerTokenHash: hashToken(organizerToken),
        players: {
          create: playerNames.map((name, index) => ({
            name,
            seed: index + 1,
          })),
        },
        organizerSessions: {
          create: {
            tokenHash: hashToken(organizerToken),
            label: "Dispositivo inicial",
          },
        },
      },
      select: {
        id: true,
        sequenceNumber: true,
      },
    });

    const finalTitle = title ?? formatAutomaticTournamentTitle(tournament.sequenceNumber);

    if (!title) {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { title: finalTitle },
      });
    }

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "tournament_created",
        entityType: "Tournament",
        entityId: publicCode,
        afterJson: {
          publicCode,
          title: finalTitle,
          system: tournamentInput.system,
          roundsPlanned: tournamentInput.roundsPlanned,
          gamesPerMatch: tournamentInput.gamesPerMatch,
          tiebreaks,
          players: playerNames.length,
        },
      },
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(organizerCookieName(publicCode), organizerToken, organizerCookieOptions());

  redirect(`/torneos/${publicCode}`);
}

const pinAttemptLimit = 6;
const pinAttemptWindowMs = 5 * 60 * 1000;

async function clientFingerprint() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";

  return ip;
}

export async function searchTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = publicCodeSchema.safeParse(formData.get("publicCode"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Codigo invalido." };
  }

  redirect(`/torneos/${normalizePublicCode(parsed.data)}`);
}

export async function unlockOrganizerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const publicCodeParsed = publicCodeSchema.safeParse(formData.get("publicCode"));
  const pinParsed = organizerPinSchema.safeParse(formData.get("organizerPin"));

  if (!publicCodeParsed.success) {
    return { error: publicCodeParsed.error.issues[0]?.message ?? "Codigo invalido." };
  }

  if (!pinParsed.success) {
    return { error: pinParsed.error.issues[0]?.message ?? "PIN invalido." };
  }

  const publicCode = normalizePublicCode(publicCodeParsed.data);
  const rateKey = `pin:${publicCode}:${await clientFingerprint()}`;
  const limit = rateLimit(rateKey, pinAttemptLimit, pinAttemptWindowMs);

  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60000));
    return {
      error: `Demasiados intentos de PIN. Espera ${minutes} minuto(s) e intenta de nuevo.`,
    };
  }

  const tournament = await db().tournament.findUnique({
    where: { publicCode },
    select: {
      id: true,
      publicCode: true,
      organizerPinHash: true,
    },
  });

  if (!tournament) {
    return { error: "Torneo no encontrado." };
  }

  if (!verifySecret(pinParsed.data, tournament.organizerPinHash)) {
    return { error: "PIN incorrecto." };
  }

  resetRateLimit(rateKey);

  const organizerToken = createSecretToken();

  await db().$transaction([
    db().organizerSession.create({
      data: {
        tournamentId: tournament.id,
        tokenHash: hashToken(organizerToken),
        label: "Desbloqueo con PIN",
      },
    }),
    db().auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "organizer_unlocked",
        entityType: "Tournament",
        entityId: tournament.publicCode,
        afterJson: {
          publicCode: tournament.publicCode,
        },
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(
    organizerCookieName(tournament.publicCode),
    organizerToken,
    organizerCookieOptions(),
  );

  revalidatePath(`/torneos/${tournament.publicCode}`);
  redirect(`/torneos/${tournament.publicCode}`);
}

async function requireOrganizer(publicCode: string) {
  const normalizedCode = normalizePublicCode(publicCode);
  const cookieStore = await cookies();
  const organizerToken = cookieStore.get(organizerCookieName(normalizedCode))?.value;

  const tournament = await db().tournament.findUnique({
    where: { publicCode: normalizedCode },
    include: {
      players: {
        orderBy: { seed: "asc" },
      },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          games: {
            orderBy: [{ boardNumber: "asc" }, { leg: "asc" }],
          },
        },
      },
      organizerSessions: true,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado.");
  }

  const hasPrimaryToken = organizerToken
    ? verifyToken(organizerToken, tournament.organizerTokenHash)
    : false;
  const organizerSession = organizerToken
    ? tournament.organizerSessions.find((session) =>
        verifyToken(organizerToken, session.tokenHash),
      )
    : undefined;

  if (!organizerToken || (!hasPrimaryToken && !organizerSession)) {
    throw new Error("No tienes permiso de organizador para editar este torneo.");
  }

  if (organizerSession) {
    await db().organizerSession.update({
      where: { id: organizerSession.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return tournament;
}

function assertPlayersEditable(tournament: Awaited<ReturnType<typeof requireOrganizer>>) {
  if (tournament.status === "closed" || tournament.status === "cancelled") {
    throw new Error("No se pueden modificar jugadores en un torneo cerrado o cancelado.");
  }
}

function assertTournamentLive(
  tournament: Awaited<ReturnType<typeof requireOrganizer>>,
  accion: string,
) {
  if (tournament.status === "closed") {
    throw new Error(`El torneo esta cerrado. Reabrelo para ${accion}.`);
  }

  if (tournament.status === "cancelled") {
    throw new Error(`El torneo esta cancelado y no permite ${accion}.`);
  }
}

function playerHasGames(
  tournament: Awaited<ReturnType<typeof requireOrganizer>>,
  playerId: string,
) {
  return tournament.rounds.some((round) =>
    round.games.some(
      (game) => game.whitePlayerId === playerId || game.blackPlayerId === playerId,
    ),
  );
}

function findTournamentPlayer(
  tournament: Awaited<ReturnType<typeof requireOrganizer>>,
  playerId: string,
) {
  const player = tournament.players.find((candidate) => candidate.id === playerId);

  if (!player) {
    throw new Error("Jugador no encontrado.");
  }

  return player;
}

export async function addPlayerAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const parsedName = playerNameSchema.safeParse(formData.get("playerName"));
  const tournament = await requireOrganizer(publicCode);

  assertPlayersEditable(tournament);

  if (tournament.system === "round_robin" && tournament.rounds.length > 0) {
    throw new Error(
      "En torneos de todos contra todos no se pueden agregar jugadores una vez iniciadas las rondas. " +
        "El sistema genera todos los pareos con la lista inicial.",
    );
  }

  if (!parsedName.success) {
    throw new Error(parsedName.error.issues[0]?.message ?? "Nombre invalido.");
  }

  const nextSeed =
    tournament.players.reduce((highest, player) => Math.max(highest, player.seed), 0) + 1;

  await db().$transaction(async (tx) => {
    const player = await tx.player.create({
      data: {
        tournamentId: tournament.id,
        name: parsedName.data,
        seed: nextSeed,
      },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "player_added",
        entityType: "Player",
        entityId: player.id,
        afterJson: {
          id: player.id,
          name: player.name,
          seed: player.seed,
          status: player.status,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function updatePlayerNameAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const parsedPlayerId = playerIdSchema.safeParse(formData.get("playerId"));
  const parsedName = playerNameSchema.safeParse(formData.get("playerName"));
  const tournament = await requireOrganizer(publicCode);

  assertPlayersEditable(tournament);

  if (!parsedPlayerId.success) {
    throw new Error(parsedPlayerId.error.issues[0]?.message ?? "Jugador invalido.");
  }

  if (!parsedName.success) {
    throw new Error(parsedName.error.issues[0]?.message ?? "Nombre invalido.");
  }

  const player = findTournamentPlayer(tournament, parsedPlayerId.data);

  await db().$transaction(async (tx) => {
    await tx.player.update({
      where: { id: player.id },
      data: { name: parsedName.data },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "player_updated",
        entityType: "Player",
        entityId: player.id,
        beforeJson: {
          name: player.name,
        },
        afterJson: {
          name: parsedName.data,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function setPlayerStatusAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const parsedPlayerId = playerIdSchema.safeParse(formData.get("playerId"));
  const parsedStatus = playerStatusSchema.safeParse(formData.get("status"));
  const tournament = await requireOrganizer(publicCode);

  assertPlayersEditable(tournament);

  if (!parsedPlayerId.success) {
    throw new Error(parsedPlayerId.error.issues[0]?.message ?? "Jugador invalido.");
  }

  if (!parsedStatus.success) {
    throw new Error("Estado de jugador invalido.");
  }

  const player = findTournamentPlayer(tournament, parsedPlayerId.data);
  const nextStatus = parsedStatus.data as PlayerStatus;
  const action =
    nextStatus === "active"
      ? "player_reactivated"
      : nextStatus === "withdrawn"
        ? "player_withdrawn"
        : "player_marked_absent";

  await db().$transaction(async (tx) => {
    await tx.player.update({
      where: { id: player.id },
      data: { status: nextStatus },
    });

    // Al retirar o marcar ausente, las partidas pendientes del jugador se
    // resuelven como forfeit para que la ronda pueda cerrarse (no hay UI para
    // registrar forfeit manualmente).
    if (nextStatus !== "active") {
      const statusById = new Map(
        tournament.players.map((candidate) => [candidate.id, candidate.status as PlayerStatus]),
      );
      statusById.set(player.id, nextStatus);

      const pendingGames = tournament.rounds
        .flatMap((round) => round.games)
        .filter(
          (game) =>
            game.result === "unplayed" &&
            (game.whitePlayerId === player.id || game.blackPlayerId === player.id),
        );

      const affectedRoundIds = new Set<string>();
      for (const game of pendingGames) {
        const whiteActive = game.whitePlayerId
          ? statusById.get(game.whitePlayerId) === "active"
          : false;
        const blackActive = game.blackPlayerId
          ? statusById.get(game.blackPlayerId) === "active"
          : false;
        const forfeitResult: GameResult =
          !whiteActive && !blackActive
            ? "double_forfeit"
            : !whiteActive
              ? "white_forfeit"
              : "black_forfeit";
        const scores = getGameScores(forfeitResult);
        await tx.game.update({
          where: { id: game.id },
          data: {
            result: forfeitResult,
            whiteScore: scores.whiteScore,
            blackScore: scores.blackScore,
            isForfeit: true,
          },
        });
        affectedRoundIds.add(game.roundId);
      }

      for (const roundId of affectedRoundIds) {
        const remaining = await tx.game.count({
          where: { roundId, result: "unplayed" },
        });
        if (remaining === 0) {
          await tx.round.update({
            where: { id: roundId },
            data: { status: "completed", completedAt: new Date() },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action,
        entityType: "Player",
        entityId: player.id,
        beforeJson: {
          status: player.status,
        },
        afterJson: {
          status: nextStatus,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function deletePlayerAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const parsedPlayerId = playerIdSchema.safeParse(formData.get("playerId"));
  const tournament = await requireOrganizer(publicCode);

  assertPlayersEditable(tournament);

  if (!parsedPlayerId.success) {
    throw new Error(parsedPlayerId.error.issues[0]?.message ?? "Jugador invalido.");
  }

  const player = findTournamentPlayer(tournament, parsedPlayerId.data);

  if (playerHasGames(tournament, player.id)) {
    throw new Error("Este jugador ya tiene partidas. Puedes retirarlo, pero no borrarlo.");
  }

  await db().$transaction(async (tx) => {
    await tx.player.delete({
      where: { id: player.id },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "player_deleted",
        entityType: "Player",
        entityId: player.id,
        beforeJson: {
          id: player.id,
          name: player.name,
          seed: player.seed,
          status: player.status,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function generateNextRoundAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const tournament = await requireOrganizer(publicCode);

  assertTournamentLive(tournament, "generar rondas");

  const engineTournament = toEngineTournament(tournament);
  const preview = generateNextRoundPreview(engineTournament);

  const blockedWarning = preview.warnings.find((w) => w.code === "blocked");
  if (blockedWarning) {
    throw new Error(blockedWarning.message ?? "No se puede generar ronda.");
  }

  if (preview.round.games.length === 0) {
    throw new Error(preview.warnings[0]?.message ?? "No hay partidas para generar.");
  }

  const tiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, tiebreaks);
  const playerNamesById = new Map(
    tournament.players.map((player) => [player.id, player.name]),
  );
  const pairingInput = {
    roundNumber: preview.round.roundNumber,
    system: engineTournament.system,
    players: standings
      .filter((standing) =>
        engineTournament.players.some(
          (player) => player.id === standing.playerId && player.status === "active",
        ),
      )
      .map((standing) => ({
        seed: standing.seed,
        name: standing.name,
        points: standing.points,
        colorBalance: getColorBalance(standing),
      })),
  };
  const pairingOutput = preview.round.games.map((game) => ({
    boardNumber: game.boardNumber,
    white: game.whitePlayerId ? playerNamesById.get(game.whitePlayerId) ?? null : null,
    black: game.blackPlayerId ? playerNamesById.get(game.blackPlayerId) ?? null : null,
    isBye: Boolean(game.isBye),
  }));

  await db().$transaction(async (tx) => {
    const existingRound = await tx.round.findUnique({
      where: {
        tournamentId_roundNumber: {
          tournamentId: tournament.id,
          roundNumber: preview.round.roundNumber,
        },
      },
      select: { id: true },
    });

    if (existingRound) {
      throw new Error(
        `La ronda ${preview.round.roundNumber} ya fue generada. Recarga la pagina.`,
      );
    }

    const roundFullyResolved = preview.round.games.every(
      (game) => game.result !== "unplayed",
    );
    const round = await tx.round.create({
      data: {
        tournamentId: tournament.id,
        roundNumber: preview.round.roundNumber,
        status: roundFullyResolved ? "completed" : "paired",
        pairedAt: new Date(),
        completedAt: roundFullyResolved ? new Date() : null,
      },
    });

    await tx.game.createMany({
      data: preview.round.games.map((game) => ({
        tournamentId: tournament.id,
        roundId: round.id,
        boardNumber: game.boardNumber,
        leg: game.leg ?? 1,
        whitePlayerId: game.whitePlayerId ?? null,
        blackPlayerId: game.blackPlayerId ?? null,
        result: game.result,
        whiteScore: game.whiteScore ?? null,
        blackScore: game.blackScore ?? null,
        isBye: game.isBye ?? false,
        isForfeit: game.isForfeit ?? false,
      })),
    });

    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        currentRoundNumber: preview.round.roundNumber,
        status: "active",
      },
    });

    await tx.pairingAttempt.create({
      data: {
        tournamentId: tournament.id,
        roundNumber: preview.round.roundNumber,
        algorithm:
          engineTournament.system === "round_robin"
            ? "round_robin_v1"
            : "swiss_greedy_v1",
        inputJson: pairingInput,
        outputJson: pairingOutput,
        warningsJson: preview.warnings,
      },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "round_generated",
        entityType: "Round",
        entityId: String(preview.round.roundNumber),
        afterJson: {
          roundNumber: preview.round.roundNumber,
          games: preview.round.games.length,
          warnings: preview.warnings,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function recordResultAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  const result = String(formData.get("result") ?? "") as GameResult;

  if (!editableResults.includes(result)) {
    throw new Error("Resultado invalido.");
  }

  const normalizedCode = normalizePublicCode(publicCode);
  const cookieStore = await cookies();
  const organizerToken = cookieStore.get(organizerCookieName(normalizedCode))?.value;

  // Parallel: auth fields | specific game record. Se permite editar cualquier
  // ronda (herramienta de corrección del organizador), verificando que la
  // partida pertenezca a ESTE torneo.
  const [tournamentData, game] = await Promise.all([
    db().tournament.findUnique({
      where: { publicCode: normalizedCode },
      select: {
        id: true,
        publicCode: true,
        status: true,
        organizerTokenHash: true,
        organizerSessions: { select: { id: true, tokenHash: true } },
      },
    }),
    db().game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        tournamentId: true,
        roundId: true,
        result: true,
        isBye: true,
        whiteScore: true,
        blackScore: true,
      },
    }),
  ]);

  if (!tournamentData) throw new Error("Torneo no encontrado.");

  const hasPrimaryToken = organizerToken
    ? verifyToken(organizerToken, tournamentData.organizerTokenHash)
    : false;
  const organizerSession = organizerToken
    ? tournamentData.organizerSessions.find((s) => verifyToken(organizerToken, s.tokenHash))
    : undefined;

  if (!organizerToken || (!hasPrimaryToken && !organizerSession)) {
    throw new Error("No tienes permiso de organizador para editar este torneo.");
  }

  if (tournamentData.status === "closed") {
    throw new Error("El torneo esta cerrado. Reabrelo para cambiar resultados.");
  }
  if (tournamentData.status === "cancelled") {
    throw new Error("El torneo esta cancelado y no permite cambiar resultados.");
  }

  if (!game) throw new Error("Partida no encontrada.");
  if (game.tournamentId !== tournamentData.id) {
    throw new Error("Partida no encontrada en este torneo.");
  }
  if (game.isBye || game.result === "bye") {
    throw new Error("Un BYE ya esta resuelto automaticamente.");
  }

  // Non-critical: update session touch without blocking the response
  if (organizerSession) {
    void db()
      .organizerSession.update({
        where: { id: organizerSession.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  const scores = getGameScores(result);

  await db().$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: {
        result,
        whiteScore: scores.whiteScore,
        blackScore: scores.blackScore,
        isForfeit: result.includes("forfeit"),
      },
    });

    const remainingPending = await tx.game.count({
      where: {
        roundId: game.roundId,
        result: "unplayed",
      },
    });

    if (remainingPending === 0) {
      await tx.round.update({
        where: { id: game.roundId },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tournamentId: tournamentData.id,
        action: game.result === "unplayed" ? "result_recorded" : "result_changed",
        entityType: "Game",
        entityId: gameId,
        beforeJson: {
          result: game.result,
          whiteScore: game.whiteScore,
          blackScore: game.blackScore,
        },
        afterJson: {
          result,
          whiteScore: scores.whiteScore,
          blackScore: scores.blackScore,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournamentData.publicCode}`);
}

export async function closeTournamentAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const tournament = await requireOrganizer(publicCode);

  if (tournament.status === "closed") {
    throw new Error("El torneo ya esta cerrado.");
  }

  if (tournament.status === "cancelled") {
    throw new Error("Un torneo cancelado no se puede cerrar.");
  }

  if (tournament.rounds.length === 0) {
    throw new Error("Genera al menos una ronda antes de cerrar el torneo.");
  }

  const pendingGames = tournament.rounds.flatMap((r) =>
    r.games.filter((game) => game.result === "unplayed"),
  );

  if (pendingGames.length > 0) {
    throw new Error(
      `Faltan ${pendingGames.length} resultado(s) pendientes antes de cerrar el torneo.`,
    );
  }

  const engineTournament = toEngineTournament(tournament);
  const tiebreaks = readTiebreaks(tournament.tiebreaks, engineTournament.system);
  const standings = calculateStandings(engineTournament, tiebreaks);
  const rows = buildFinalStandingRows(standings);
  const closedAt = new Date();

  await db().$transaction(async (tx) => {
    await tx.standingSnapshot.create({
      data: {
        tournamentId: tournament.id,
        roundNumber: tournament.currentRoundNumber,
        data: {
          closedAt: closedAt.toISOString(),
          tiebreaks,
          rows,
        },
      },
    });

    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        status: "closed",
        closedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "tournament_closed",
        entityType: "Tournament",
        entityId: tournament.publicCode,
        afterJson: {
          closedAt: closedAt.toISOString(),
          podium: rows.slice(0, 3).map((row) => ({
            rank: row.rank,
            name: row.name,
            points: row.points,
          })),
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

export async function reopenTournamentAction(formData: FormData) {
  const publicCode = String(formData.get("publicCode") ?? "");
  const tournament = await requireOrganizer(publicCode);

  if (tournament.status !== "closed") {
    throw new Error("Solo se puede reabrir un torneo cerrado.");
  }

  await db().$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        status: "active",
        closedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        action: "tournament_reopened",
        entityType: "Tournament",
        entityId: tournament.publicCode,
        beforeJson: {
          closedAt: tournament.closedAt?.toISOString() ?? null,
        },
      },
    });
  });

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

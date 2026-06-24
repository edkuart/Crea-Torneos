"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSecretToken,
  hashSecret,
  hashToken,
  verifySecret,
  verifyToken,
} from "@/lib/security";
import { toEngineTournament } from "@/modules/tournaments/adapters";
import { createPublicCode, normalizePublicCode, organizerCookieName } from "@/modules/tournaments/codes";
import type { GameResult, PlayerStatus } from "@/modules/tournaments/engine-types";
import { generateNextRoundPreview } from "@/modules/tournaments/pairings";
import { getGameScores } from "@/modules/tournaments/scoring";
import {
  formatAutomaticTournamentTitle,
  normalizeTiebreaks,
} from "@/modules/tournaments/tiebreaks";
import {
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

export async function createTournamentAction(formData: FormData) {
  const parsed = createTournamentSchema.safeParse({
    title: formData.get("title"),
    system: formData.get("system"),
    tiebreaks: formData.getAll("tiebreaks"),
    roundsPlanned: formData.get("roundsPlanned"),
    organizerPin: formData.get("organizerPin"),
    playerNames: formData.get("playerNames"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const publicCode = await createUniquePublicCode();
  const organizerToken = createSecretToken();
  const { organizerPin, playerNames, title, ...tournamentInput } = parsed.data;
  const tiebreaks = normalizeTiebreaks(tournamentInput.tiebreaks, tournamentInput.system);

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
          tiebreaks,
          players: playerNames.length,
        },
      },
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(organizerCookieName(publicCode), organizerToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  redirect(`/torneos/${publicCode}`);
}

export async function searchTournamentAction(formData: FormData) {
  const parsed = publicCodeSchema.safeParse(formData.get("publicCode"));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Codigo invalido.");
  }

  redirect(`/torneos/${normalizePublicCode(parsed.data)}`);
}

export async function unlockOrganizerAction(formData: FormData) {
  const publicCodeParsed = publicCodeSchema.safeParse(formData.get("publicCode"));
  const pinParsed = organizerPinSchema.safeParse(formData.get("organizerPin"));

  if (!publicCodeParsed.success) {
    throw new Error(publicCodeParsed.error.issues[0]?.message ?? "Codigo invalido.");
  }

  if (!pinParsed.success) {
    throw new Error(pinParsed.error.issues[0]?.message ?? "PIN invalido.");
  }

  const publicCode = normalizePublicCode(publicCodeParsed.data);
  const tournament = await db().tournament.findUnique({
    where: { publicCode },
    select: {
      id: true,
      publicCode: true,
      organizerPinHash: true,
    },
  });

  if (!tournament) {
    throw new Error("Torneo no encontrado.");
  }

  if (!verifySecret(pinParsed.data, tournament.organizerPinHash)) {
    throw new Error("PIN incorrecto.");
  }

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
  cookieStore.set(organizerCookieName(tournament.publicCode), organizerToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

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
            orderBy: { boardNumber: "asc" },
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
  const preview = generateNextRoundPreview(toEngineTournament(tournament));

  if (preview.warnings.some((warning) => warning.code === "blocked")) {
    throw new Error(preview.warnings[0]?.message ?? "No se puede generar ronda.");
  }

  if (preview.round.games.length === 0) {
    throw new Error(preview.warnings[0]?.message ?? "No hay partidas para generar.");
  }

  await db().$transaction(async (tx) => {
    const round = await tx.round.create({
      data: {
        tournamentId: tournament.id,
        roundNumber: preview.round.roundNumber,
        status: preview.round.games.every((game) => game.result === "bye")
          ? "completed"
          : "paired",
        pairedAt: new Date(),
      },
    });

    await tx.game.createMany({
      data: preview.round.games.map((game) => ({
        tournamentId: tournament.id,
        roundId: round.id,
        boardNumber: game.boardNumber,
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
  const tournament = await requireOrganizer(publicCode);

  if (!editableResults.includes(result)) {
    throw new Error("Resultado invalido.");
  }

  const game = tournament.rounds
    .flatMap((round) => round.games)
    .find((candidate) => candidate.id === gameId);

  if (!game) {
    throw new Error("Partida no encontrada.");
  }

  if (game.isBye || game.result === "bye") {
    throw new Error("Un BYE ya esta resuelto automaticamente.");
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
        tournamentId: tournament.id,
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

  revalidatePath(`/torneos/${tournament.publicCode}`);
}

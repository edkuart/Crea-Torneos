import type {
  EngineGame,
  EnginePlayer,
  EngineRound,
  EngineTournament,
  PairingPreview,
  PlayerStanding,
} from "./engine-types";
import {
  calculateStandings,
  getColorBalance,
  getNextRoundBlocker,
  hasPlayerHadBye,
  havePlayersMet,
} from "./standings";

type PairingPlayer = EnginePlayer & {
  points: number;
  colorBalance: number;
};

function activePlayers(players: EnginePlayer[]) {
  return players
    .filter((player) => player.status === "active")
    .sort((a, b) => a.seed - b.seed);
}

function createGame(
  roundNumber: number,
  boardNumber: number,
  whitePlayerId?: string,
  blackPlayerId?: string,
): EngineGame {
  return {
    id: `r${roundNumber}-b${boardNumber}`,
    boardNumber,
    whitePlayerId,
    blackPlayerId,
    result: "unplayed",
  };
}

function buildPairingPlayer(
  player: EnginePlayer,
  standingsByPlayer: Map<string, PlayerStanding>,
): PairingPlayer {
  const standing = standingsByPlayer.get(player.id);

  return {
    ...player,
    points: standing?.points ?? 0,
    colorBalance: standing ? getColorBalance(standing) : 0,
  };
}

function assignColors(playerA: PairingPlayer, playerB: PairingPlayer) {
  if (playerA.colorBalance > playerB.colorBalance) {
    return { whitePlayerId: playerB.id, blackPlayerId: playerA.id };
  }

  if (playerB.colorBalance > playerA.colorBalance) {
    return { whitePlayerId: playerA.id, blackPlayerId: playerB.id };
  }

  return playerA.seed <= playerB.seed
    ? { whitePlayerId: playerA.id, blackPlayerId: playerB.id }
    : { whitePlayerId: playerB.id, blackPlayerId: playerA.id };
}

export function generateRoundRobinRounds(players: EnginePlayer[]) {
  const participants = activePlayers(players);

  if (participants.length < 2) {
    return [];
  }

  const slots = participants.length % 2 === 1
    ? [...participants, { id: "BYE", name: "BYE", seed: 9999, status: "active" as const }]
    : [...participants];
  const rounds: EngineRound[] = [];
  const rotating = [...slots];
  const roundCount = rotating.length - 1;
  const half = rotating.length / 2;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const roundNumber = roundIndex + 1;
    const games: EngineGame[] = [];

    for (let boardIndex = 0; boardIndex < half; boardIndex += 1) {
      const playerA = rotating[boardIndex];
      const playerB = rotating[rotating.length - 1 - boardIndex];

      if (!playerA || !playerB) {
        continue;
      }

      if (playerA.id === "BYE" || playerB.id === "BYE") {
        const realPlayer = playerA.id === "BYE" ? playerB : playerA;
        games.push({
          ...createGame(roundNumber, games.length + 1, realPlayer.id),
          result: "bye",
          whiteScore: 1,
          blackScore: 0,
          isBye: true,
        });
        continue;
      }

      const flip = (roundIndex + boardIndex) % 2 === 1;
      games.push(
        createGame(
          roundNumber,
          games.length + 1,
          flip ? playerB.id : playerA.id,
          flip ? playerA.id : playerB.id,
        ),
      );
    }

    rounds.push({
      id: `rr-r${roundNumber}`,
      roundNumber,
      status: "paired",
      games,
    });

    rotating.splice(1, 0, rotating.pop() as EnginePlayer);
  }

  return rounds;
}

export function generateSwissNextRound(tournament: EngineTournament): PairingPreview {
  const blocker = getNextRoundBlocker(tournament);
  const roundNumber = tournament.rounds.length + 1;

  if (blocker) {
    return {
      round: {
        id: `blocked-r${roundNumber}`,
        roundNumber,
        status: "pending",
        games: [],
      },
      warnings: [{ code: "blocked", message: blocker }],
    };
  }

  const standings = calculateStandings(tournament);
  const standingsByPlayer = new Map(
    standings.map((standing) => [standing.playerId, standing]),
  );
  let pairingPlayers = activePlayers(tournament.players)
    .map((player) => buildPairingPlayer(player, standingsByPlayer))
    .sort((a, b) => b.points - a.points || a.seed - b.seed);
  const warnings: PairingPreview["warnings"] = [];
  const games: EngineGame[] = [];

  if (pairingPlayers.length < 2) {
    return {
      round: {
        id: `swiss-r${roundNumber}`,
        roundNumber,
        status: "pending",
        games: [],
      },
      warnings: [
        {
          code: "not_enough_players",
          message: "Se necesitan al menos 2 jugadores activos para generar ronda.",
        },
      ],
    };
  }

  if (pairingPlayers.length % 2 === 1) {
    const byePlayer = [...pairingPlayers]
      .reverse()
      .find((player) => !hasPlayerHadBye(tournament, player.id));

    if (byePlayer) {
      games.push({
        ...createGame(roundNumber, 1, byePlayer.id),
        result: "bye",
        whiteScore: 1,
        blackScore: 0,
        isBye: true,
      });
      pairingPlayers = pairingPlayers.filter((player) => player.id !== byePlayer.id);
    } else {
      warnings.push({
        code: "bye_unavailable",
        message: "Todos los jugadores activos ya recibieron bye.",
      });
    }
  }

  let boardNumber = games.length + 1;
  const unpaired = [...pairingPlayers];

  while (unpaired.length > 1) {
    const player = unpaired.shift() as PairingPlayer;
    const opponentIndex = unpaired.findIndex(
      (candidate) => !havePlayersMet(tournament, player.id, candidate.id),
    );
    const selectedIndex = opponentIndex >= 0 ? opponentIndex : 0;
    const opponent = unpaired.splice(selectedIndex, 1)[0];

    if (!opponent) {
      break;
    }

    if (opponentIndex === -1) {
      warnings.push({
        code: "repeat_pairing",
        message: `No se encontro rival nuevo para ${player.name}; se permitio repeticion.`,
      });
    }

    const colors = assignColors(player, opponent);
    games.push(createGame(roundNumber, boardNumber, colors.whitePlayerId, colors.blackPlayerId));
    boardNumber += 1;
  }

  return {
    round: {
      id: `swiss-r${roundNumber}`,
      roundNumber,
      status: "paired",
      games,
    },
    warnings,
  };
}

export function generateNextRoundPreview(tournament: EngineTournament): PairingPreview {
  if (tournament.system === "round_robin") {
    const blocker = getNextRoundBlocker(tournament);
    const roundNumber = tournament.rounds.length + 1;

    if (blocker) {
      return {
        round: {
          id: `blocked-r${roundNumber}`,
          roundNumber,
          status: "pending",
          games: [],
        },
        warnings: [{ code: "blocked", message: blocker }],
      };
    }

    const rounds = generateRoundRobinRounds(tournament.players);
    const nextRound = rounds[tournament.rounds.length];

    return {
      round: nextRound ?? {
        id: "round-robin-complete",
        roundNumber,
        status: "pending",
        games: [],
      },
      warnings: nextRound
        ? []
        : [
            {
              code: "round_robin_complete",
              message: "Ya no hay rondas de todos contra todos por generar.",
            },
          ],
    };
  }

  return generateSwissNextRound(tournament);
}


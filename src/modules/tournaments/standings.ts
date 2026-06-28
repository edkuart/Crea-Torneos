import type {
  EngineGame,
  EngineTournament,
  PlayerStanding,
} from "./engine-types";
import { getGameScores, isCompletedResult } from "./scoring";
import type { TiebreakCode } from "./tiebreaks";

function createStanding(player: EngineTournament["players"][number]): PlayerStanding {
  return {
    playerId: player.id,
    name: player.name,
    seed: player.seed,
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    blackWins: 0,
    buchholz: 0,
    buchholzCut1: 0,
    medianBuchholz: 0,
    sonnebornBerger: 0,
    progressive: 0,
    opponentIds: [],
    opponentResults: [],
    directScores: {},
    colorHistory: [],
  };
}

function applyGameToStanding(
  standing: PlayerStanding,
  game: EngineGame,
  color: "white" | "black",
) {
  if (!isCompletedResult(game.result)) {
    return;
  }

  const scores = getGameScores(game.result);
  const score = color === "white" ? scores.whiteScore : scores.blackScore;
  const opponentScore = color === "white" ? scores.blackScore : scores.whiteScore;

  standing.points += score;

  if (game.isBye || game.result === "bye") {
    standing.byes += 1;
    standing.colorHistory.push("bye");
    return;
  }

  standing.played += 1;
  standing.colorHistory.push(color);

  if (score > opponentScore) {
    standing.wins += 1;
    if (color === "black") {
      standing.blackWins += 1;
    }
  } else if (score === opponentScore) {
    standing.draws += 1;
  } else {
    standing.losses += 1;
  }
}

function applyOpponentRecord(
  standing: PlayerStanding,
  opponentId: string | null | undefined,
  score: number,
  opponentScore: number,
) {
  if (!opponentId) {
    return;
  }

  standing.opponentIds.push(opponentId);
  standing.opponentResults.push({
    opponentId,
    score,
    opponentScore,
  });
  standing.directScores[opponentId] = (standing.directScores[opponentId] ?? 0) + score;
}

function applyComputedTiebreaks(standingsByPlayer: Map<string, PlayerStanding>) {
  for (const standing of standingsByPlayer.values()) {
    const opponentPoints = standing.opponentIds
      .map((opponentId) => standingsByPlayer.get(opponentId)?.points ?? 0);

    standing.buchholz = opponentPoints.reduce((total, points) => total + points, 0);
    standing.buchholzCut1 =
      opponentPoints.length > 0
        ? standing.buchholz - Math.min(...opponentPoints)
        : 0;

    const sortedOpponentPoints = [...opponentPoints].sort((a, b) => a - b);
    standing.medianBuchholz = sortedOpponentPoints
      .slice(1, -1)
      .reduce((total, points) => total + points, 0);

    standing.sonnebornBerger = standing.opponentResults.reduce((total, result) => {
      const opponentPoints = standingsByPlayer.get(result.opponentId)?.points ?? 0;

      if (result.score > result.opponentScore) {
        return total + opponentPoints;
      }

      if (result.score === result.opponentScore) {
        return total + opponentPoints / 2;
      }

      return total;
    }, 0);
  }
}

export function calculateStandings(
  tournament: EngineTournament,
  tiebreaks: TiebreakCode[] = [],
) {
  const standingsByPlayer = new Map(
    tournament.players.map((player) => [player.id, createStanding(player)]),
  );

  for (const round of tournament.rounds) {
    for (const game of round.games) {
      if (!isCompletedResult(game.result)) {
        continue;
      }

      const scores = getGameScores(game.result);
      const whiteStanding = game.whitePlayerId
        ? standingsByPlayer.get(game.whitePlayerId)
        : undefined;
      const blackStanding = game.blackPlayerId
        ? standingsByPlayer.get(game.blackPlayerId)
        : undefined;

      if (whiteStanding) {
        applyGameToStanding(whiteStanding, game, "white");
        applyOpponentRecord(
          whiteStanding,
          game.blackPlayerId,
          scores.whiteScore,
          scores.blackScore,
        );
      }

      if (blackStanding) {
        applyGameToStanding(blackStanding, game, "black");
        applyOpponentRecord(
          blackStanding,
          game.whitePlayerId,
          scores.blackScore,
          scores.whiteScore,
        );
      }
    }

    if (round.games.every((g) => isCompletedResult(g.result))) {
      for (const standing of standingsByPlayer.values()) {
        standing.progressive += standing.points;
      }
    }
  }

  applyComputedTiebreaks(standingsByPlayer);

  return [...standingsByPlayer.values()].sort((a, b) =>
    compareStandings(a, b, tiebreaks),
  );
}

function getTiebreakComparison(
  a: PlayerStanding,
  b: PlayerStanding,
  tiebreak: TiebreakCode,
) {
  switch (tiebreak) {
    case "buchholz_cut_1":
      return b.buchholzCut1 - a.buchholzCut1;
    case "buchholz":
      return b.buchholz - a.buchholz;
    case "median_buchholz":
      return b.medianBuchholz - a.medianBuchholz;
    case "progressive":
      return b.progressive - a.progressive;
    case "sonneborn_berger":
      return b.sonnebornBerger - a.sonnebornBerger;
    case "direct_encounter":
      return (b.directScores[a.playerId] ?? 0) - (a.directScores[b.playerId] ?? 0);
    case "wins":
      return b.wins - a.wins;
    case "black_wins":
      return b.blackWins - a.blackWins;
  }
}

/**
 * Valor numérico de un desempate para una posición. `direct_encounter` no es un
 * escalar (se resuelve por enfrentamiento directo), por eso devuelve 0.
 */
export function getStandingTiebreakValue(
  standing: PlayerStanding,
  code: TiebreakCode,
): number {
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

export function compareStandings(
  a: PlayerStanding,
  b: PlayerStanding,
  tiebreaks: TiebreakCode[] = [],
) {
  const pointsComparison = b.points - a.points;

  if (pointsComparison !== 0) {
    return pointsComparison;
  }

  for (const tiebreak of tiebreaks) {
    const comparison = getTiebreakComparison(a, b, tiebreak);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return b.wins - a.wins || b.blackWins - a.blackWins || a.seed - b.seed;
}

export type FinalStandingRow = {
  rank: number;
  playerId: string;
  name: string;
  seed: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  blackWins: number;
  buchholz: number;
  buchholzCut1: number;
  medianBuchholz: number;
  sonnebornBerger: number;
  progressive: number;
};

/**
 * Convierte una tabla ya ordenada en filas compactas y serializables para el
 * snapshot final congelado. El orden de entrada define el puesto (rank).
 */
export function buildFinalStandingRows(
  standings: PlayerStanding[],
): FinalStandingRow[] {
  return standings.map((standing, index) => ({
    rank: index + 1,
    playerId: standing.playerId,
    name: standing.name,
    seed: standing.seed,
    points: standing.points,
    played: standing.played,
    wins: standing.wins,
    draws: standing.draws,
    losses: standing.losses,
    byes: standing.byes,
    blackWins: standing.blackWins,
    buchholz: standing.buchholz,
    buchholzCut1: standing.buchholzCut1,
    medianBuchholz: standing.medianBuchholz,
    sonnebornBerger: standing.sonnebornBerger,
    progressive: standing.progressive,
  }));
}

export function getColorBalance(standing: PlayerStanding) {
  const whites = standing.colorHistory.filter((color) => color === "white").length;
  const blacks = standing.colorHistory.filter((color) => color === "black").length;

  return whites - blacks;
}

export function havePlayersMet(
  tournament: EngineTournament,
  playerAId: string,
  playerBId: string,
) {
  return tournament.rounds.some((round) =>
    round.games.some((game) => {
      const pair = [game.whitePlayerId, game.blackPlayerId];
      return pair.includes(playerAId) && pair.includes(playerBId);
    }),
  );
}

export function hasPlayerHadBye(tournament: EngineTournament, playerId: string) {
  return tournament.rounds.some((round) =>
    round.games.some(
      (game) =>
        (game.isBye || game.result === "bye") && game.whitePlayerId === playerId,
    ),
  );
}

export function getNextRoundBlocker(tournament: EngineTournament) {
  const lastRound = tournament.rounds.at(-1);

  if (tournament.rounds.length >= tournament.roundsPlanned) {
    return "El torneo ya alcanzo el numero de rondas configurado.";
  }

  if (!lastRound) {
    return null;
  }

  const pendingGames = lastRound.games.filter((game) => game.result === "unplayed");

  if (pendingGames.length > 0) {
    return `Faltan ${pendingGames.length} resultado(s) de la ronda ${lastRound.roundNumber}.`;
  }

  return null;
}

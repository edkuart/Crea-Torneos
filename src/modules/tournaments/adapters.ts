import type { GameResult, PlayerStatus, RoundStatus, TournamentSystem } from "./engine-types";

type TournamentForEngine = {
  system: string;
  roundsPlanned: number;
  gamesPerMatch?: number;
  players: Array<{
    id: string;
    name: string;
    seed: number;
    status: string;
  }>;
  rounds: Array<{
    roundNumber: number;
    status: string;
    games: Array<{
      id?: string;
      boardNumber: number;
      leg?: number;
      whitePlayerId: string | null;
      blackPlayerId: string | null;
      result: string;
      whiteScore: number | null;
      blackScore: number | null;
      isBye: boolean;
      isForfeit: boolean;
    }>;
  }>;
};

export function toEngineTournament(tournament: TournamentForEngine) {
  return {
    system: tournament.system as TournamentSystem,
    roundsPlanned: tournament.roundsPlanned,
    gamesPerMatch: tournament.gamesPerMatch ?? 1,
    players: tournament.players.map((player) => ({
      id: player.id,
      name: player.name,
      seed: player.seed,
      status: player.status as PlayerStatus,
    })),
    rounds: tournament.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      status: round.status as RoundStatus,
      games: round.games.map((game) => ({
        id: game.id,
        boardNumber: game.boardNumber,
        leg: game.leg ?? 1,
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        result: game.result as GameResult,
        whiteScore: game.whiteScore,
        blackScore: game.blackScore,
        isBye: game.isBye,
        isForfeit: game.isForfeit,
      })),
    })),
  };
}


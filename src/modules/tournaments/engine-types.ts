export type TournamentSystem = "swiss" | "round_robin";

export type PlayerStatus = "active" | "withdrawn" | "absent";

export type RoundStatus =
  | "pending"
  | "paired"
  | "in_progress"
  | "completed"
  | "locked";

export type GameResult =
  | "white_win"
  | "black_win"
  | "draw"
  | "white_forfeit"
  | "black_forfeit"
  | "double_forfeit"
  | "bye"
  | "unplayed";

export type EnginePlayer = {
  id: string;
  name: string;
  seed: number;
  status: PlayerStatus;
};

export type EngineGame = {
  id?: string;
  boardNumber: number;
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
  result: GameResult;
  whiteScore?: number | null;
  blackScore?: number | null;
  isBye?: boolean;
  isForfeit?: boolean;
};

export type EngineRound = {
  id?: string;
  roundNumber: number;
  status: RoundStatus;
  games: EngineGame[];
};

export type EngineTournament = {
  system: TournamentSystem;
  roundsPlanned: number;
  players: EnginePlayer[];
  rounds: EngineRound[];
};

export type PlayerStanding = {
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
  opponentIds: string[];
  opponentResults: Array<{
    opponentId: string;
    score: number;
    opponentScore: number;
  }>;
  directScores: Record<string, number>;
  colorHistory: Array<"white" | "black" | "bye">;
};

export type PairingWarning = {
  code: string;
  message: string;
};

export type PairingPreview = {
  round: EngineRound;
  warnings: PairingWarning[];
};

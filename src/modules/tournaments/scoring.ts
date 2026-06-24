import type { GameResult } from "./engine-types";

export function isCompletedResult(result: GameResult) {
  return result !== "unplayed";
}

export function getGameScores(result: GameResult) {
  switch (result) {
    case "white_win":
      return { whiteScore: 1, blackScore: 0 };
    case "black_win":
      return { whiteScore: 0, blackScore: 1 };
    case "draw":
      return { whiteScore: 0.5, blackScore: 0.5 };
    case "white_forfeit":
      return { whiteScore: 0, blackScore: 1 };
    case "black_forfeit":
      return { whiteScore: 1, blackScore: 0 };
    case "double_forfeit":
      return { whiteScore: 0, blackScore: 0 };
    case "bye":
      return { whiteScore: 1, blackScore: 0 };
    case "unplayed":
      return { whiteScore: 0, blackScore: 0 };
  }
}

export function formatGameResult(result: GameResult) {
  switch (result) {
    case "white_win":
      return "1-0";
    case "black_win":
      return "0-1";
    case "draw":
      return "1/2-1/2";
    case "white_forfeit":
      return "0-1 incomparecencia";
    case "black_forfeit":
      return "1-0 incomparecencia";
    case "double_forfeit":
      return "0-0";
    case "bye":
      return "BYE";
    case "unplayed":
      return "Pendiente";
  }
}


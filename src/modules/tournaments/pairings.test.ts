import { describe, expect, it } from "vitest";
import type { EngineTournament } from "./engine-types";
import { generateNextRoundPreview, generateRoundRobinRounds } from "./pairings";
import { calculateStandings } from "./standings";

function baseTournament(playerCount: number): EngineTournament {
  return {
    system: "swiss",
    roundsPlanned: 3,
    players: Array.from({ length: playerCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Jugador ${index + 1}`,
      seed: index + 1,
      status: "active",
    })),
    rounds: [],
  };
}

describe("generateNextRoundPreview", () => {
  it("pairs an even swiss field by seed in round one", () => {
    const preview = generateNextRoundPreview(baseTournament(4));

    expect(preview.warnings).toEqual([]);
    expect(preview.round.games).toMatchObject([
      { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2" },
      { boardNumber: 2, whitePlayerId: "p3", blackPlayerId: "p4" },
    ]);
  });

  it("assigns one bye in an odd swiss field", () => {
    const preview = generateNextRoundPreview(baseTournament(5));

    expect(preview.round.games).toHaveLength(3);
    expect(preview.round.games[0]).toMatchObject({
      whitePlayerId: "p5",
      result: "bye",
      isBye: true,
    });
  });

  it("blocks next swiss round while previous games are pending", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [generateNextRoundPreview(tournament).round];

    const preview = generateNextRoundPreview(tournament);

    expect(preview.warnings[0]?.code).toBe("blocked");
  });

  it("does not pair withdrawn or absent players", () => {
    const tournament = baseTournament(4);
    tournament.players[2] = {
      ...tournament.players[2]!,
      status: "withdrawn",
    };
    tournament.players[3] = {
      ...tournament.players[3]!,
      status: "absent",
    };

    const preview = generateNextRoundPreview(tournament);

    expect(preview.round.games).toHaveLength(1);
    expect(preview.round.games[0]).toMatchObject({
      whitePlayerId: "p1",
      blackPlayerId: "p2",
    });
  });

  it("calculates standings after completed games", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p2",
            result: "white_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p3",
            blackPlayerId: "p4",
            result: "draw",
          },
        ],
      },
    ];

    const standings = calculateStandings(tournament);

    expect(standings.map((standing) => standing.playerId)).toEqual([
      "p1",
      "p3",
      "p4",
      "p2",
    ]);
    expect(standings[0]?.points).toBe(1);
    expect(standings[1]?.points).toBe(0.5);
  });
});

describe("generateRoundRobinRounds", () => {
  it("creates one less round than the player slots", () => {
    const rounds = generateRoundRobinRounds(baseTournament(4).players);

    expect(rounds).toHaveLength(3);
    expect(rounds[0]?.games).toHaveLength(2);
  });

  it("adds byes for odd round robin fields", () => {
    const rounds = generateRoundRobinRounds(baseTournament(3).players);

    expect(rounds).toHaveLength(3);
    expect(rounds.flatMap((round) => round.games).some((game) => game.isBye)).toBe(
      true,
    );
  });

  it("keeps the schedule stable and forfeits games when a player is withdrawn", () => {
    const baseline = generateRoundRobinRounds(baseTournament(4).players);

    const withWithdrawal = baseTournament(4);
    withWithdrawal.players[2] = {
      ...withWithdrawal.players[2]!,
      status: "withdrawn",
    }; // p3
    const adjusted = generateRoundRobinRounds(withWithdrawal.players);

    expect(adjusted).toHaveLength(baseline.length);

    for (let r = 0; r < baseline.length; r += 1) {
      for (let g = 0; g < baseline[r]!.games.length; g += 1) {
        const base = baseline[r]!.games[g]!;
        const adj = adjusted[r]!.games[g]!;

        // La estructura del calendario no cambia: mismos jugadores y colores.
        expect(adj.whitePlayerId).toBe(base.whitePlayerId);
        expect(adj.blackPlayerId).toBe(base.blackPlayerId);

        const involvesP3 = adj.whitePlayerId === "p3" || adj.blackPlayerId === "p3";
        if (involvesP3) {
          expect(adj.isForfeit).toBe(true);
          expect(["white_forfeit", "black_forfeit", "double_forfeit"]).toContain(
            adj.result,
          );
        } else {
          expect(adj.result).toBe("unplayed");
        }
      }
    }
  });

  it("assigns the forfeit point to the active opponent", () => {
    const tournament = baseTournament(4);
    tournament.players[1] = {
      ...tournament.players[1]!,
      status: "withdrawn",
    }; // p2

    const games = generateRoundRobinRounds(tournament.players).flatMap(
      (round) => round.games,
    );
    const p2Games = games.filter(
      (game) => game.whitePlayerId === "p2" || game.blackPlayerId === "p2",
    );

    expect(p2Games.length).toBeGreaterThan(0);
    for (const game of p2Games) {
      expect(game.isForfeit).toBe(true);
      if (game.whitePlayerId === "p2") {
        expect(game.whiteScore).toBe(0);
        expect(game.blackScore).toBe(1);
      } else {
        expect(game.whiteScore).toBe(1);
        expect(game.blackScore).toBe(0);
      }
    }
  });

  it("plays both legs on the same board for a double round robin", () => {
    const rounds = generateRoundRobinRounds(baseTournament(4).players, 2);

    // 4 jugadores → 3 rondas (N-1). Las vueltas van dentro de la ronda, no en
    // rondas extra.
    expect(rounds).toHaveLength(3);

    const board1 = rounds[0]!.games.filter((game) => game.boardNumber === 1);
    expect(board1).toHaveLength(2);
    expect(board1[0]!.leg).toBe(1);
    expect(board1[1]!.leg).toBe(2);
    // Misma mesa, colores invertidos entre las dos partidas.
    expect(board1[1]!.whitePlayerId).toBe(board1[0]!.blackPlayerId);
    expect(board1[1]!.blackPlayerId).toBe(board1[0]!.whitePlayerId);
  });
});

describe("double games per match in swiss", () => {
  it("plays both legs on the same board with inverted colors", () => {
    const tournament = baseTournament(4);
    tournament.gamesPerMatch = 2;

    const preview = generateNextRoundPreview(tournament);

    // 2 mesas × 2 partidas = 4 juegos.
    expect(preview.round.games).toHaveLength(4);

    // Las dos partidas de la mesa 1 son el mismo par con colores invertidos.
    const board1 = preview.round.games.filter((g) => g.boardNumber === 1);
    expect(board1).toHaveLength(2);
    expect(board1[0]!.leg).toBe(1);
    expect(board1[1]!.leg).toBe(2);
    expect(board1[1]!.whitePlayerId).toBe(board1[0]!.blackPlayerId);
    expect(board1[1]!.blackPlayerId).toBe(board1[0]!.whitePlayerId);
  });

  it("keeps a single game for the bye in odd double-game fields", () => {
    const tournament = baseTournament(3);
    tournament.gamesPerMatch = 2;

    const preview = generateNextRoundPreview(tournament);

    const byeGames = preview.round.games.filter((g) => g.isBye);
    expect(byeGames).toHaveLength(1);
    // Un par real (2 partidas) + un bye (1 partida) = 3 juegos.
    expect(preview.round.games).toHaveLength(3);
  });

  it("does not pair the same opponents again in the next round", () => {
    const tournament = baseTournament(4);
    tournament.gamesPerMatch = 2;
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p2", blackPlayerId: "p1", result: "white_win" },
          { boardNumber: 3, whitePlayerId: "p3", blackPlayerId: "p4", result: "white_win" },
          { boardNumber: 4, whitePlayerId: "p4", blackPlayerId: "p3", result: "white_win" },
        ],
      },
    ];

    const preview = generateNextRoundPreview(tournament);

    const repeated = preview.round.games.some((g) => {
      const pair = [g.whitePlayerId, g.blackPlayerId];
      return (
        (pair.includes("p1") && pair.includes("p2")) ||
        (pair.includes("p3") && pair.includes("p4"))
      );
    });
    expect(repeated).toBe(false);
  });
});

describe("late entrants in swiss", () => {
  it("avoids pairing late entrants against each other when established opponents exist", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p3", blackPlayerId: "p4", result: "white_win" },
        ],
      },
    ];
    tournament.players.push(
      { id: "p5", name: "Tardio 1", seed: 5, status: "active" },
      { id: "p6", name: "Tardio 2", seed: 6, status: "active" },
    );

    const preview = generateNextRoundPreview(tournament);

    expect(preview.warnings.some((w) => w.code === "late_entrants")).toBe(true);
    const lateVsLate = preview.round.games.some(
      (g) =>
        (g.whitePlayerId === "p5" && g.blackPlayerId === "p6") ||
        (g.whitePlayerId === "p6" && g.blackPlayerId === "p5"),
    );
    expect(lateVsLate).toBe(false);
  });

  it("allows late-vs-late only when no established opponent is available", () => {
    const tournament = baseTournament(2);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2", result: "white_win" },
        ],
      },
    ];
    // 4 late entrants, only 2 established players
    tournament.players.push(
      { id: "p3", name: "Tardio 1", seed: 3, status: "active" },
      { id: "p4", name: "Tardio 2", seed: 4, status: "active" },
      { id: "p5", name: "Tardio 3", seed: 5, status: "active" },
      { id: "p6", name: "Tardio 4", seed: 6, status: "active" },
    );

    const preview = generateNextRoundPreview(tournament);

    // p1 and p2 should each pair against a late entrant, not each other
    const p1p2Paired = preview.round.games.some(
      (g) =>
        (g.whitePlayerId === "p1" && g.blackPlayerId === "p2") ||
        (g.whitePlayerId === "p2" && g.blackPlayerId === "p1"),
    );
    expect(p1p2Paired).toBe(false);
    // At most one late-vs-late pairing (only 2 established players for 4 late entrants)
    const lateIds = new Set(["p3", "p4", "p5", "p6"]);
    const lateVsLatePairings = preview.round.games.filter(
      (g) => lateIds.has(g.whitePlayerId ?? "") && lateIds.has(g.blackPlayerId ?? ""),
    );
    expect(lateVsLatePairings.length).toBeLessThanOrEqual(1);
  });

  it("does not affect pairing when no late entrants", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p3", blackPlayerId: "p4", result: "white_win" },
        ],
      },
    ];

    const preview = generateNextRoundPreview(tournament);

    expect(preview.warnings.some((w) => w.code === "late_entrants")).toBe(false);
    expect(preview.round.games).toHaveLength(2);
  });
});

describe("calculateStandings tiebreaks", () => {
  it("calculates Buchholz and Buchholz Cut 1 from opponents final scores", () => {
    const tournament = baseTournament(6);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p3",
            result: "white_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p2",
            blackPlayerId: "p6",
            result: "white_win",
          },
          {
            boardNumber: 3,
            whitePlayerId: "p4",
            blackPlayerId: "p5",
            result: "white_win",
          },
        ],
      },
      {
        roundNumber: 2,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p4",
            result: "black_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p2",
            blackPlayerId: "p5",
            result: "black_win",
          },
          {
            boardNumber: 3,
            whitePlayerId: "p3",
            blackPlayerId: "p6",
            result: "white_win",
          },
        ],
      },
    ];

    const standings = calculateStandings(tournament, ["buchholz"]);
    const playerOne = standings.find((standing) => standing.playerId === "p1");
    const playerTwo = standings.find((standing) => standing.playerId === "p2");

    expect(playerOne?.buchholz).toBe(3);
    expect(playerOne?.buchholzCut1).toBe(2);
    expect(playerTwo?.buchholz).toBe(1);
    expect(playerTwo?.buchholzCut1).toBe(1);
    expect(standings.findIndex((standing) => standing.playerId === "p1")).toBeLessThan(
      standings.findIndex((standing) => standing.playerId === "p2"),
    );
  });

  it("calculates Sonneborn-Berger from defeated and drawn opponents", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p2",
            result: "white_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p3",
            blackPlayerId: "p4",
            result: "white_win",
          },
        ],
      },
      {
        roundNumber: 2,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p3",
            result: "draw",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p2",
            blackPlayerId: "p4",
            result: "white_win",
          },
        ],
      },
    ];

    const standings = calculateStandings(tournament, ["sonneborn_berger"]);
    const playerOne = standings.find((standing) => standing.playerId === "p1");

    expect(playerOne?.points).toBe(1.5);
    expect(playerOne?.sonnebornBerger).toBe(1.75);
  });

  it("uses direct encounter when selected for tied players", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p2",
            result: "white_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p3",
            blackPlayerId: "p4",
            result: "white_win",
          },
        ],
      },
      {
        roundNumber: 2,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p2",
            blackPlayerId: "p3",
            result: "white_win",
          },
          {
            boardNumber: 2,
            whitePlayerId: "p4",
            blackPlayerId: "p1",
            result: "white_win",
          },
        ],
      },
    ];

    const standings = calculateStandings(tournament, ["direct_encounter"]);

    expect(standings.findIndex((standing) => standing.playerId === "p1")).toBeLessThan(
      standings.findIndex((standing) => standing.playerId === "p2"),
    );
  });

  it("breaks ties by progressive (cumulative) score", () => {
    const tournament = baseTournament(2);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p1",
            blackPlayerId: "p2",
            result: "white_win",
          },
        ],
      },
      {
        roundNumber: 2,
        status: "completed",
        games: [
          {
            boardNumber: 1,
            whitePlayerId: "p2",
            blackPlayerId: "p1",
            result: "white_win",
          },
        ],
      },
    ];

    const standings = calculateStandings(tournament, ["progressive"]);
    const playerOne = standings.find((standing) => standing.playerId === "p1");
    const playerTwo = standings.find((standing) => standing.playerId === "p2");

    expect(playerOne?.points).toBe(1);
    expect(playerTwo?.points).toBe(1);
    expect(playerOne?.progressive).toBe(2);
    expect(playerTwo?.progressive).toBe(1);
    expect(standings[0]?.playerId).toBe("p1");
  });

  it("calculates median Buchholz removing best and worst opponents", () => {
    const tournament = baseTournament(4);
    tournament.rounds = [
      {
        roundNumber: 1,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p2", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p3", blackPlayerId: "p4", result: "white_win" },
        ],
      },
      {
        roundNumber: 2,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p3", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p2", blackPlayerId: "p4", result: "white_win" },
        ],
      },
      {
        roundNumber: 3,
        status: "completed",
        games: [
          { boardNumber: 1, whitePlayerId: "p1", blackPlayerId: "p4", result: "white_win" },
          { boardNumber: 2, whitePlayerId: "p2", blackPlayerId: "p3", result: "white_win" },
        ],
      },
    ];

    const standings = calculateStandings(tournament, ["median_buchholz"]);
    const playerOne = standings.find((standing) => standing.playerId === "p1");

    // Rivales de p1: p2(2), p3(1), p4(0). Buchholz=3, mediana quita 2 y 0 => 1.
    expect(playerOne?.buchholz).toBe(3);
    expect(playerOne?.medianBuchholz).toBe(1);
  });
});

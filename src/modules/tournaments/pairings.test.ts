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

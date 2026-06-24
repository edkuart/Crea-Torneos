import type { TournamentSystem } from "./engine-types";

export const tiebreakCodes = [
  "buchholz_cut_1",
  "buchholz",
  "sonneborn_berger",
  "direct_encounter",
  "wins",
  "black_wins",
] as const;

export type TiebreakCode = (typeof tiebreakCodes)[number];

export const tiebreakLabels: Record<TiebreakCode, string> = {
  buchholz_cut_1: "Buchholz Cut 1",
  buchholz: "Buchholz",
  sonneborn_berger: "Sonneborn-Berger",
  direct_encounter: "Encuentro directo",
  wins: "Victorias",
  black_wins: "Victorias con negras",
};

const tiebreakCodeSet = new Set<string>(tiebreakCodes);

const defaultTiebreaksBySystem: Record<TournamentSystem, TiebreakCode[]> = {
  swiss: [
    "buchholz_cut_1",
    "buchholz",
    "sonneborn_berger",
    "direct_encounter",
    "wins",
    "black_wins",
  ],
  round_robin: [
    "sonneborn_berger",
    "direct_encounter",
    "wins",
    "black_wins",
  ],
};

export function getDefaultTiebreaks(system: TournamentSystem) {
  return [...defaultTiebreaksBySystem[system]];
}

export function normalizeTiebreaks(
  values: unknown[],
  system: TournamentSystem,
): TiebreakCode[] {
  const uniqueCodes = values.reduce<TiebreakCode[]>((codes, value) => {
    if (typeof value !== "string" || !tiebreakCodeSet.has(value)) {
      return codes;
    }

    const code = value as TiebreakCode;

    return codes.includes(code) ? codes : [...codes, code];
  }, []);

  return uniqueCodes.length > 0 ? uniqueCodes : getDefaultTiebreaks(system);
}

export function readTiebreaks(value: unknown, system: TournamentSystem) {
  return Array.isArray(value)
    ? normalizeTiebreaks(value, system)
    : getDefaultTiebreaks(system);
}

export function formatTiebreakLabel(code: TiebreakCode) {
  return tiebreakLabels[code];
}

export function formatAutomaticTournamentTitle(sequenceNumber: number) {
  return `Torneo ${sequenceNumber.toString().padStart(3, "0")}`;
}

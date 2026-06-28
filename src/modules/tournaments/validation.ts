import { z } from "zod";
import { tiebreakCodes } from "./tiebreaks";

/** Estado devuelto por server actions con formularios para mostrar errores inline. */
export type ActionState = { error?: string };

export const tournamentSystemSchema = z.enum(["swiss", "round_robin"]);
export const tiebreakCodeSchema = z.enum(tiebreakCodes);
export const playerStatusSchema = z.enum(["active", "withdrawn", "absent"]);

const optionalTournamentTitleSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(90, "Usa un nombre mas corto."),
  )
  .refine((value) => value.length === 0 || value.length >= 3, {
    message: "Usa al menos 3 letras o deja el nombre vacio.",
  })
  .transform((value) => (value.length > 0 ? value : null));

export const createTournamentSchema = z.object({
  title: optionalTournamentTitleSchema,
  system: tournamentSystemSchema.catch("swiss"),
  tiebreaks: z.array(tiebreakCodeSchema).catch([]),
  roundsPlanned: z.coerce.number().int().min(1).max(15).catch(3),
  gamesPerMatch: z.coerce.number().int().min(1).max(2).catch(1),
  organizerPin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "Usa un PIN de 4 a 8 numeros."),
  playerNames: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(/\r?\n|,/)
        .map((name) => name.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().min(1).max(60))
        .min(2, "Agrega al menos 2 jugadores.")
        .max(80, "El MVP acepta hasta 80 jugadores."),
    )
    .transform((names) => [...new Set(names)]),
});

export const publicCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^CT-[A-Z0-9]{4,6}$/, "Usa un codigo como CT-4821.");

export const organizerPinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Usa el PIN de 4 a 8 numeros.");

export const playerIdSchema = z.string().trim().min(1, "Jugador invalido.");

export const playerNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe el nombre del jugador.")
  .max(60, "Usa un nombre mas corto.");

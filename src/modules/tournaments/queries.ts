import { db } from "@/lib/db";
import { normalizePublicCode } from "./codes";

export async function getTournamentByCode(publicCode: string) {
  return db().tournament.findUnique({
    where: { publicCode: normalizePublicCode(publicCode) },
    include: {
      players: {
        orderBy: { seed: "asc" },
      },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          games: {
            orderBy: { boardNumber: "asc" },
            include: {
              whitePlayer: true,
              blackPlayer: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      pairingAttempts: {
        orderBy: { createdAt: "desc" },
      },
      organizerSessions: true,
    },
  });
}

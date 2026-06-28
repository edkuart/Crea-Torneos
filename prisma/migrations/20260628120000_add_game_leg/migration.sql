-- AlterTable: una mesa puede tener dos partidas (ida y vuelta) en la misma ronda.
ALTER TABLE "games"
ADD COLUMN "leg" INTEGER NOT NULL DEFAULT 1;

-- El número de mesa ya no es único por sí solo dentro de la ronda; lo es junto al leg.
DROP INDEX "games_round_id_board_number_key";

CREATE UNIQUE INDEX "games_round_id_board_number_leg_key"
ON "games"("round_id", "board_number", "leg");

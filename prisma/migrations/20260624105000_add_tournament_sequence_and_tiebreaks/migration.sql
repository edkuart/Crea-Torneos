-- AlterTable
ALTER TABLE "tournaments"
ADD COLUMN "sequence_number" SERIAL NOT NULL,
ADD COLUMN "tiebreaks" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_sequence_number_key" ON "tournaments"("sequence_number");

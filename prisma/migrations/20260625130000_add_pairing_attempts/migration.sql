-- CreateTable
CREATE TABLE "pairing_attempts" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB NOT NULL,
    "warnings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pairing_attempts_tournament_id_round_number_idx" ON "pairing_attempts"("tournament_id", "round_number");

-- AddForeignKey
ALTER TABLE "pairing_attempts" ADD CONSTRAINT "pairing_attempts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

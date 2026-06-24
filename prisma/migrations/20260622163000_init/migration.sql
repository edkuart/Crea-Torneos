-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TournamentSystem" AS ENUM ('swiss', 'round_robin');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('setup', 'active', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('active', 'withdrawn', 'absent');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('pending', 'paired', 'in_progress', 'completed', 'locked');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('white_win', 'black_win', 'draw', 'white_forfeit', 'black_forfeit', 'double_forfeit', 'bye', 'unplayed');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "public_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "system" "TournamentSystem" NOT NULL DEFAULT 'swiss',
    "rounds_planned" INTEGER NOT NULL,
    "current_round_number" INTEGER NOT NULL DEFAULT 0,
    "status" "TournamentStatus" NOT NULL DEFAULT 'setup',
    "location_label" TEXT,
    "starts_at" TIMESTAMP(3),
    "organizer_pin_hash" TEXT NOT NULL,
    "organizer_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_sessions" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER,
    "seed" INTEGER NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'pending',
    "paired_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "board_number" INTEGER NOT NULL,
    "white_player_id" TEXT,
    "black_player_id" TEXT,
    "result" "GameResult" NOT NULL DEFAULT 'unplayed',
    "white_score" DOUBLE PRECISION,
    "black_score" DOUBLE PRECISION,
    "is_bye" BOOLEAN NOT NULL DEFAULT false,
    "is_forfeit" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standing_snapshots" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standing_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_public_code_key" ON "tournaments"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "players_tournament_id_seed_key" ON "players"("tournament_id", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_tournament_id_round_number_key" ON "rounds"("tournament_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "games_round_id_board_number_key" ON "games"("round_id", "board_number");

-- AddForeignKey
ALTER TABLE "organizer_sessions" ADD CONSTRAINT "organizer_sessions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_fkey" FOREIGN KEY ("white_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_fkey" FOREIGN KEY ("black_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_snapshots" ADD CONSTRAINT "standing_snapshots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DiscordActivityType" AS ENUM ('CUSTOM', 'LISTENING', 'WATCHING', 'PLAYING');

-- CreateTable
CREATE TABLE "DiscordActivity" (
    "id" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "type" "DiscordActivityType" NOT NULL DEFAULT 'CUSTOM',
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordActivity_pkey" PRIMARY KEY ("id")
);

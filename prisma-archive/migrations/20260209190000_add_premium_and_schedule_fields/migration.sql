-- CreateEnum
CREATE TYPE "MotivationFrequency" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMotivationSentAt" TIMESTAMP(3),
ADD COLUMN     "motivationDay" INTEGER,
ADD COLUMN     "motivationFrequency" "MotivationFrequency" NOT NULL DEFAULT 'Daily';

-- Fix motivationTime default (was incorrectly set to cron format in previous migration)
ALTER TABLE "Guild" ALTER COLUMN "motivationTime" SET DEFAULT '08:00';

-- Fix any rows that got the cron-format default
UPDATE "Guild" SET "motivationTime" = '08:00' WHERE "motivationTime" = '0 8 * * *';

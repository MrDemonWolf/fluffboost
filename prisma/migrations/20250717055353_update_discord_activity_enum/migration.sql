/*
  Warnings:

  - The values [WATCHING] on the enum `DiscordActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DiscordActivityType_new" AS ENUM ('CUSTOM', 'LISTENING', 'STREAMING', 'PLAYING');
ALTER TABLE "DiscordActivity" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "DiscordActivity" ALTER COLUMN "type" TYPE "DiscordActivityType_new" USING ("type"::text::"DiscordActivityType_new");
ALTER TYPE "DiscordActivityType" RENAME TO "DiscordActivityType_old";
ALTER TYPE "DiscordActivityType_new" RENAME TO "DiscordActivityType";
DROP TYPE "DiscordActivityType_old";
ALTER TABLE "DiscordActivity" ALTER COLUMN "type" SET DEFAULT 'CUSTOM';
COMMIT;

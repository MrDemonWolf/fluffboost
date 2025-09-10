/*
  Warnings:

  - You are about to drop the column `guildId` on the `SuggestionQuote` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `SuggestionQuote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "motivationTime" TEXT DEFAULT '08:00',
ADD COLUMN     "timezone" TEXT DEFAULT 'America/Chicago';

-- AlterTable
ALTER TABLE "SuggestionQuote" DROP COLUMN "guildId",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

/*
  Warnings:

  - You are about to drop the column `motivationChannel` on the `Guild` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Guild" DROP COLUMN "motivationChannel",
ADD COLUMN     "motivationChannelId" TEXT;

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "motivationTime" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

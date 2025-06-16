-- AlterTable
ALTER TABLE "GameParticipant" ADD COLUMN     "percentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharedCode" BOOLEAN NOT NULL DEFAULT false;

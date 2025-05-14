/*
  Warnings:

  - You are about to drop the column `isConnected` on the `GameParticipant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GameParticipant" DROP COLUMN "isConnected";

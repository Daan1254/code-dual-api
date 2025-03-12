/*
  Warnings:

  - Added the required column `challengeId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "challengeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GameParticipant" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentCode" TEXT,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CodeChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "testCases" JSONB NOT NULL,
    "starterCode" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeChallenge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CodeChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

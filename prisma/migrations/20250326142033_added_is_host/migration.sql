-- AlterTable
ALTER TABLE "GameParticipant" ADD COLUMN     "isHost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" "ProgrammingLanguage" NOT NULL DEFAULT 'TYPESCRIPT';

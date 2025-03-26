import { Module } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [],
})
export class GameParticipantModule {}

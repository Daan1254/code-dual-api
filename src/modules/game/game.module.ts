import { Module } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
  imports: [],
  controllers: [GameController],
  providers: [GameService, GameGateway, PrismaService, GameRepository],
})
export class GameModule {}

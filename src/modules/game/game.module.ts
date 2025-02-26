import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { GameQueueProcessor } from './game-queue.processor';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'game',
    }),
  ],
  controllers: [GameController],
  providers: [GameQueueProcessor, GameRepository, GameService],
})
export class GameModule {}

import { Module } from '@nestjs/common';
import { ChallengeModule } from '../challenge/challenge.module';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  imports: [ChallengeModule],
  controllers: [GameController],
  providers: [GameService, GameGateway],
})
export class GameModule {}

import { Module } from '@nestjs/common';
import { ChallengeModule } from './challenge/challenge.module';
import { GameParticipantModule } from './game-participant/game-participant.module';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ChallengeModule, GameModule, GameParticipantModule, UserModule],
})
export class ModulesModule {}

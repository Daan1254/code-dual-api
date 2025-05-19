import { Module } from '@nestjs/common';
import { ChallengeModule } from './challenge/challenge.module';
import { GameParticipantModule } from './game-participant/game-participant.module';
import { GameModule } from './game/game.module';
import { StatisticModule } from './statistic/statistic.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ChallengeModule,
    GameModule,
    GameParticipantModule,
    UserModule,
    StatisticModule,
    SubscriptionModule,
  ],
})
export class ModulesModule {}

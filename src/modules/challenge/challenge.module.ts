import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Module({
  imports: [],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}

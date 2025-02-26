import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class GameService {
  constructor(@InjectQueue('game') private gameQueue: Queue) {}

  async joinQueue(userId: string) {
    await this.gameQueue.add('processGame', { userId });
  }

  async leaveQueue(userId: string) {
    // await this.gameQueue.removeListener(userId);
  }
}

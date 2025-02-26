import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('game')
export class GameQueueProcessor {
  @Process('processGame')
  async handleGame(job: Job) {
    try {
      const gameData = job.data;
      // Process your game logic here
      console.log('Processing game:', gameData);

      // You can update progress
      await job.progress(50);

      // More processing...

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

import { Module } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PrismaService],
})
export class SubscriptionModule {}

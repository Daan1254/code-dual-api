import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { GameModule } from './modules/game/game.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [AuthModule, UserModule, SubscriptionModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

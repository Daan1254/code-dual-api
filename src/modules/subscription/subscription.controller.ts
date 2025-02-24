import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('current')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Get the current subscription',
  })
  async getCurrentSubscription(@Req() req: RequestWithAuth) {
    return this.subscriptionService.getCurrentSubscription(req.user.id);
  }
}

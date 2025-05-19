import { Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { SubscriptionDto } from './dto/subscription.dto';
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

  @Get()
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Get all subscriptions',
    type: SubscriptionDto,
    isArray: true,
  })
  async getSubscriptions() {
    return this.subscriptionService.getSubscriptions();
  }
  @Post('create-checkout-session')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Create a checkout session',
  })
  async createCheckoutSession(@Req() req: RequestWithAuth) {
    return this.subscriptionService.createCheckoutSession(req.user.id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { RedirectDto } from './dto/redirect.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('current')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Get the current subscription',
    type: SubscriptionDto,
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

  @Post('create-checkout-session-for-subscription')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Create a checkout session for a specific subscription',
  })
  async createCheckoutSessionForSubscription(
    @Req() req: RequestWithAuth,
    @Body('priceId') priceId: string,
  ) {
    return this.subscriptionService.createCheckoutSessionForSubscription(
      req.user.id,
      priceId,
    );
  }

  @Patch('change')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Change subscription to a different plan',
  })
  async changeSubscription(
    @Req() req: RequestWithAuth,
    @Body('priceId') priceId: string,
  ) {
    return this.subscriptionService.changeSubscription(req.user.id, priceId);
  }

  @Delete('cancel')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Cancel subscription',
  })
  async cancelSubscription(@Req() req: RequestWithAuth) {
    return this.subscriptionService.cancelSubscription(req.user.id);
  }

  @Post('customer-portal')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Create a customer portal session for billing and invoices',
    type: RedirectDto,
  })
  async createCustomerPortalSession(@Req() req: RequestWithAuth) {
    return this.subscriptionService.createCustomerPortalSession(req.user.id);
  }
}

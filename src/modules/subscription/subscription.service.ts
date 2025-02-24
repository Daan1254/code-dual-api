import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private readonly stripe: Stripe;
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_ACCOUNT_ID) {
      throw new Error('STRIPE_SECRET_KEY or STRIPE_ACCOUNT_ID is not set');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
      stripeAccount: process.env.STRIPE_ACCOUNT_ID,
    });
  }

  async getCurrentSubscription(userId: string) {
    const customers = await this.stripe.subscriptions.list();
    return customers;
  }
}

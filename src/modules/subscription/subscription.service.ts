import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import Stripe from 'stripe';
import { SubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly stripe: Stripe;
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_ACCOUNT_ID) {
      throw new Error('STRIPE_SECRET_KEY or STRIPE_ACCOUNT_ID is not set');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async getSubscriptions() {
    const subscriptions = await this.stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    return subscriptions.data.map((subscription) =>
      SubscriptionDto.fromStripe(subscription),
    );
  }

  async getCurrentSubscription(userId: string) {
    const customers = await this.stripe.subscriptions.list({
      customer: userId,
    });
    return customers;
  }

  async createCheckoutSession(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customer: Stripe.Customer;

    if (user.stripeCustomerId) {
      customer = (await this.stripe.customers.retrieve(
        user.stripeCustomerId,
      )) as Stripe.Customer;
    } else {
      customer = await this.stripe.customers.create({
        email: user.email,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1RQPuxBob58MyrDKQf4gGHv6',
          quantity: 1,
        },
      ],
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/cancel`,
    });

    return { url: session.url };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
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
    return subscriptions.data.map((subscription) => ({
      ...SubscriptionDto.fromStripe(subscription),
      status: 'available',
    }));
  }

  async getCurrentSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user?.stripeCustomerId) {
      return null;
    }

    const customer = await this.stripe.customers.retrieve(
      user.stripeCustomerId,
      {
        expand: ['subscriptions', 'subscriptions.data.items'],
      },
    );

    const activeSubscription = (customer as Stripe.Customer).subscriptions
      ?.data[0];
    if (!activeSubscription) {
      return null;
    }

    const product = await this.stripe.products.retrieve(
      activeSubscription.items.data[0].price.product as string,
      {
        expand: ['default_price'],
      },
    );

    return {
      ...SubscriptionDto.fromStripe(product),
      status: activeSubscription.status,
    };
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
          price: 'price_1RQR6vBob58MyrDKKHM4hFJg',
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONT_END_URL}/dashboard/subscriptions`,
      cancel_url: `${process.env.FRONT_END_URL}/dashboard/subscriptions`,
    });

    return { url: session.url };
  }

  async changeSubscription(userId: string, newPriceId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('User not found or no stripe customer ID');
    }

    const customer = await this.stripe.customers.retrieve(
      user.stripeCustomerId,
      {
        expand: ['subscriptions'],
      },
    );

    const activeSubscription = (customer as Stripe.Customer).subscriptions
      ?.data[0];

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Update the subscription to the new price
    const updatedSubscription = await this.stripe.subscriptions.update(
      activeSubscription.id,
      {
        items: [
          {
            id: activeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    );

    return {
      message: 'Subscription updated successfully',
      subscriptionId: updatedSubscription.id,
    };
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('User not found or no stripe customer ID');
    }

    const customer = await this.stripe.customers.retrieve(
      user.stripeCustomerId,
      {
        expand: ['subscriptions'],
      },
    );

    const activeSubscription = (customer as Stripe.Customer).subscriptions
      ?.data[0];

    if (!activeSubscription) {
      throw new Error('No active subscription found');
    }

    // Cancel the subscription at the end of the billing period
    const canceledSubscription = await this.stripe.subscriptions.update(
      activeSubscription.id,
      {
        cancel_at_period_end: true,
      },
    );

    return {
      message: 'Subscription will be canceled at the end of the billing period',
      subscriptionId: canceledSubscription.id,
    };
  }

  async createCheckoutSessionForSubscription(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
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

      // Update user with stripe customer ID
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONT_END_URL}/dashboard/subscriptions`,
      cancel_url: `${process.env.FRONT_END_URL}/dashboard/subscriptions`,
    });

    return { url: session.url };
  }

  async createCustomerPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('User not found or no stripe customer ID');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONT_END_URL}/dashboard`,
    });

    return { url: session.url };
  }
}

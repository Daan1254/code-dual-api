import { Injectable, NotFoundException } from '@nestjs/common';
import { RegisterDto } from 'src/core/auth/dto/register.dto';
import { PrismaService } from 'src/core/database/prisma.service';
import { SubscriptionDto } from '../subscription/dto/subscription.dto';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async getUserByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(body: RegisterDto) {
    return this.prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
        username: body.username,
      },
    });
  }

  async isUsernameAvailable(username: string) {
    return (await this.prisma.user.count({ where: { username } })) === 0;
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let subscription: SubscriptionDto | null = null;

    if (user.stripeCustomerId) {
      subscription = await this.subscriptionService.getCurrentSubscription(
        user.stripeCustomerId,
      );
    }

    return {
      ...user,
      subscription,
    };
  }
}

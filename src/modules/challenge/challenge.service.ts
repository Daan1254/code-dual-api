import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async findRandomChallenge() {
    const challenge = await this.prisma.codeChallenge.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!challenge) {
      throw new NotFoundException('No challenges found');
    }

    return challenge;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { ChallengeDto } from './dto/challenge.dto';

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

    return ChallengeDto.fromDb(challenge);
  }
}

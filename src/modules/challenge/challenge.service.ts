import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { PrismaService } from '../../core/database/prisma.service';
import { ChallengeDto } from './dto/challenge.dto';

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async findRandomChallenge(): Promise<ChallengeDto> {
    const challenge = await this.prisma.codeChallenge.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!challenge) {
      throw new NotFoundException('No challenges found');
    }

    const challengeData = {
      ...challenge,
      testCases: Array.isArray(challenge.testCases)
        ? challenge.testCases
        : JSON.parse(challenge.testCases as string),
    };

    return plainToClass(ChallengeDto, challengeData, {
      excludeExtraneousValues: true,
    });
  }

  async findChallengeById(id: string): Promise<ChallengeDto> {
    const challenge = await this.prisma.codeChallenge.findUnique({
      where: { id },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID ${id} not found`);
    }

    // Transform the challenge data and parse JSON testCases
    const challengeData = {
      ...challenge,
      testCases: Array.isArray(challenge.testCases)
        ? challenge.testCases
        : JSON.parse(challenge.testCases as string),
    };

    return plainToClass(ChallengeDto, challengeData, {
      excludeExtraneousValues: true,
    });
  }

  async findVisibleTestCases(challengeId: string) {
    const challenge = await this.findChallengeById(challengeId);

    // Return only non-hidden test cases for the frontend
    return {
      ...challenge,
      testCases: challenge.testCases.filter((testCase) => !testCase.hidden),
    };
  }

  async getAllTestCases(challengeId: string) {
    const challenge = await this.findChallengeById(challengeId);

    // Return all test cases for validation (including hidden ones)
    return challenge.testCases;
  }
}

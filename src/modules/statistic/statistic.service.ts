import { Injectable } from '@nestjs/common';
import { GameDifficulty, ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { StatisticDto } from './dto/statistic.dto';

@Injectable()
export class StatisticService {
  constructor(private prisma: PrismaService) {}

  async getStatistic(id: string): Promise<StatisticDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        participatedGames: {
          include: {
            game: {
              include: {
                challenge: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const games = user.participatedGames.map((gp) => gp.game);

    // Calculate various statistics
    const totalGames = games.length;
    const completedGames = games.filter((g) => g.status === 'COMPLETED').length;

    // Convert gamesByDifficulty to array format
    const gamesByDifficulty = [
      {
        difficulty: GameDifficulty.EASY,
        count: games.filter((g) => g.challenge.difficulty === 'EASY').length,
      },
      {
        difficulty: GameDifficulty.MEDIUM,
        count: games.filter((g) => g.challenge.difficulty === 'MEDIUM').length,
      },
      {
        difficulty: GameDifficulty.HARD,
        count: games.filter((g) => g.challenge.difficulty === 'HARD').length,
      },
    ];

    const completionRate =
      totalGames > 0 ? (completedGames / totalGames) * 100 : 0;

    // Convert languageUsage to array format
    const languageUsage = Object.entries(
      user.participatedGames.reduce(
        (acc, gp) => {
          acc[gp.language] = (acc[gp.language] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([language]) => language as ProgrammingLanguage);

    const averageCompletionTime =
      user.participatedGames
        .filter((gp) => gp.completedAt)
        .reduce((acc, gp) => {
          const startTime = new Date(gp.game.startsAt || gp.createdAt);
          const endTime = new Date(gp.completedAt!);
          return acc + (endTime.getTime() - startTime.getTime());
        }, 0) / completedGames || 0;

    return {
      totalGames,
      completedGames,
      completionRate: `${completionRate.toFixed(1)}%`,
      gamesByDifficulty,
      languageUsage,
      averageCompletionTimeMs: Math.round(averageCompletionTime),
      preferredLanguage: user.preferredLanguage,
    };
  }
}

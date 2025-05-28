import { Test, TestingModule } from '@nestjs/testing';
import { GameDifficulty, ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { StatisticService } from './statistic.service';

describe('StatisticService', () => {
  let service: StatisticService;
  let prismaService: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<StatisticService>(StatisticService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getStatistic', () => {
    it('should return user statistics with completed games', async () => {
      const userId = 'user-123';
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const completionTime = new Date('2024-01-01T10:30:00Z');

      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.JAVASCRIPT,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.JAVASCRIPT,
            createdAt: baseTime,
            completedAt: completionTime,
            game: {
              id: 'game-1',
              status: 'COMPLETED',
              startsAt: baseTime,
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
          {
            id: 'participant-2',
            language: ProgrammingLanguage.PYTHON,
            createdAt: baseTime,
            completedAt: null,
            game: {
              id: 'game-2',
              status: 'IN_PROGRESS',
              startsAt: baseTime,
              challenge: {
                id: 'challenge-2',
                difficulty: GameDifficulty.MEDIUM,
              },
            },
          },
          {
            id: 'participant-3',
            language: ProgrammingLanguage.JAVASCRIPT,
            createdAt: baseTime,
            completedAt: new Date('2024-01-01T10:45:00Z'),
            game: {
              id: 'game-3',
              status: 'COMPLETED',
              startsAt: baseTime,
              challenge: {
                id: 'challenge-3',
                difficulty: GameDifficulty.HARD,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      expect(result).toEqual({
        totalGames: 3,
        completedGames: 2,
        completionRate: '66.7%',
        gamesByDifficulty: [
          {
            difficulty: GameDifficulty.EASY,
            count: 1,
          },
          {
            difficulty: GameDifficulty.MEDIUM,
            count: 1,
          },
          {
            difficulty: GameDifficulty.HARD,
            count: 1,
          },
        ],
        languageUsage: [
          ProgrammingLanguage.JAVASCRIPT,
          ProgrammingLanguage.PYTHON,
        ],
        averageCompletionTimeMs: expect.any(Number),
        preferredLanguage: ProgrammingLanguage.JAVASCRIPT,
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
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
    });

    it('should return statistics for user with no games', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.TYPESCRIPT,
        participatedGames: [],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      expect(result).toEqual({
        totalGames: 0,
        completedGames: 0,
        completionRate: '0.0%',
        gamesByDifficulty: [
          {
            difficulty: GameDifficulty.EASY,
            count: 0,
          },
          {
            difficulty: GameDifficulty.MEDIUM,
            count: 0,
          },
          {
            difficulty: GameDifficulty.HARD,
            count: 0,
          },
        ],
        languageUsage: [],
        averageCompletionTimeMs: 0,
        preferredLanguage: ProgrammingLanguage.TYPESCRIPT,
      });
    });

    it('should return statistics for user with only incomplete games', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.JAVA,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.JAVA,
            createdAt: new Date(),
            completedAt: null,
            game: {
              id: 'game-1',
              status: 'IN_PROGRESS',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
          {
            id: 'participant-2',
            language: ProgrammingLanguage.JAVA,
            createdAt: new Date(),
            completedAt: null,
            game: {
              id: 'game-2',
              status: 'PENDING',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-2',
                difficulty: GameDifficulty.MEDIUM,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      expect(result).toEqual({
        totalGames: 2,
        completedGames: 0,
        completionRate: '0.0%',
        gamesByDifficulty: [
          {
            difficulty: GameDifficulty.EASY,
            count: 1,
          },
          {
            difficulty: GameDifficulty.MEDIUM,
            count: 1,
          },
          {
            difficulty: GameDifficulty.HARD,
            count: 0,
          },
        ],
        languageUsage: [ProgrammingLanguage.JAVA],
        averageCompletionTimeMs: 0,
        preferredLanguage: ProgrammingLanguage.JAVA,
      });
    });

    it('should calculate correct language usage with multiple languages', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.PYTHON,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.JAVASCRIPT,
            createdAt: new Date(),
            completedAt: new Date(),
            game: {
              id: 'game-1',
              status: 'COMPLETED',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
          {
            id: 'participant-2',
            language: ProgrammingLanguage.PYTHON,
            createdAt: new Date(),
            completedAt: new Date(),
            game: {
              id: 'game-2',
              status: 'COMPLETED',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-2',
                difficulty: GameDifficulty.MEDIUM,
              },
            },
          },
          {
            id: 'participant-3',
            language: ProgrammingLanguage.JAVASCRIPT,
            createdAt: new Date(),
            completedAt: new Date(),
            game: {
              id: 'game-3',
              status: 'COMPLETED',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-3',
                difficulty: GameDifficulty.HARD,
              },
            },
          },
          {
            id: 'participant-4',
            language: ProgrammingLanguage.TYPESCRIPT,
            createdAt: new Date(),
            completedAt: new Date(),
            game: {
              id: 'game-4',
              status: 'COMPLETED',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-4',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      expect(result.languageUsage).toEqual([
        ProgrammingLanguage.JAVASCRIPT,
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.TYPESCRIPT,
      ]);
      expect(result.totalGames).toBe(4);
      expect(result.completedGames).toBe(4);
      expect(result.completionRate).toBe('100.0%');
    });

    it('should calculate correct average completion time', async () => {
      const userId = 'user-123';
      const startTime = new Date('2024-01-01T10:00:00Z');
      const completion1 = new Date('2024-01-01T10:30:00Z'); // 30 minutes
      const completion2 = new Date('2024-01-01T10:15:00Z'); // 15 minutes
      // Average: (30 + 15) / 2 = 22.5 minutes = 1350000 ms

      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.PYTHON,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.PYTHON,
            createdAt: startTime,
            completedAt: completion1,
            game: {
              id: 'game-1',
              status: 'COMPLETED',
              startsAt: startTime,
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
          {
            id: 'participant-2',
            language: ProgrammingLanguage.PYTHON,
            createdAt: startTime,
            completedAt: completion2,
            game: {
              id: 'game-2',
              status: 'COMPLETED',
              startsAt: startTime,
              challenge: {
                id: 'challenge-2',
                difficulty: GameDifficulty.MEDIUM,
              },
            },
          },
          {
            id: 'participant-3',
            language: ProgrammingLanguage.PYTHON,
            createdAt: startTime,
            completedAt: null,
            game: {
              id: 'game-3',
              status: 'IN_PROGRESS',
              startsAt: startTime,
              challenge: {
                id: 'challenge-3',
                difficulty: GameDifficulty.HARD,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      // Expected average: (30 + 15) / 2 = 22.5 minutes = 1350000 ms
      expect(result.averageCompletionTimeMs).toBe(1350000);
      expect(result.completedGames).toBe(2);
      expect(result.totalGames).toBe(3);
    });

    it('should use createdAt as fallback when startsAt is null', async () => {
      const userId = 'user-123';
      const startTime = new Date('2024-01-01T10:00:00Z');
      const completionTime = new Date('2024-01-01T10:30:00Z'); // 30 minutes

      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.PYTHON,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.PYTHON,
            createdAt: startTime,
            completedAt: completionTime,
            game: {
              id: 'game-1',
              status: 'COMPLETED',
              startsAt: null, // This should fallback to createdAt
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      // Should use createdAt as start time, so 30 minutes = 1800000 ms
      expect(result.averageCompletionTimeMs).toBe(1800000);
    });

    it('should throw error when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getStatistic('nonexistent-user')).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle edge case with 100% completion rate', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        preferredLanguage: ProgrammingLanguage.CSHARP,
        participatedGames: [
          {
            id: 'participant-1',
            language: ProgrammingLanguage.CSHARP,
            createdAt: new Date(),
            completedAt: new Date(),
            game: {
              id: 'game-1',
              status: 'COMPLETED',
              startsAt: new Date(),
              challenge: {
                id: 'challenge-1',
                difficulty: GameDifficulty.EASY,
              },
            },
          },
        ],
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getStatistic(userId);

      expect(result.completionRate).toBe('100.0%');
      expect(result.totalGames).toBe(1);
      expect(result.completedGames).toBe(1);
    });
  });
});

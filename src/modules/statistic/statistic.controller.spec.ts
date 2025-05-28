import { Test, TestingModule } from '@nestjs/testing';
import { ProgrammingLanguage } from '@prisma/client';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { StatisticDto } from './dto/statistic.dto';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';

describe('StatisticController', () => {
  let controller: StatisticController;
  let service: StatisticService;

  const mockStatisticService = {
    getStatistic: jest.fn(),
  };

  const mockRequest: RequestWithAuth = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
  } as RequestWithAuth;

  const mockStatisticDto: StatisticDto = {
    totalGames: 25,
    completedGames: 18,
    completionRate: '72.0%',
    gamesByDifficulty: [
      { difficulty: 'EASY', count: 10 },
      { difficulty: 'MEDIUM', count: 8 },
      { difficulty: 'HARD', count: 7 },
    ],
    languageUsage: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
    ],
    averageCompletionTimeMs: 180000,
    preferredLanguage: 'typescript',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticController],
      providers: [
        {
          provide: StatisticService,
          useValue: mockStatisticService,
        },
      ],
    })
      .overrideGuard(require('../../core/auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<StatisticController>(StatisticController);
    service = module.get<StatisticService>(StatisticService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatistic', () => {
    it('should return user statistics', async () => {
      mockStatisticService.getStatistic.mockResolvedValue(mockStatisticDto);

      const result = await controller.getStatistic(mockRequest);

      expect(service.getStatistic).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockStatisticDto);
    });

    it('should return empty statistics for new user', async () => {
      const emptyStats: StatisticDto = {
        totalGames: 0,
        completedGames: 0,
        completionRate: '0.0%',
        gamesByDifficulty: [],
        languageUsage: [],
        averageCompletionTimeMs: 0,
        preferredLanguage: '',
      };
      mockStatisticService.getStatistic.mockResolvedValue(emptyStats);

      const result = await controller.getStatistic(mockRequest);

      expect(service.getStatistic).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(emptyStats);
      expect(result.totalGames).toBe(0);
      expect(result.completionRate).toBe('0.0%');
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to fetch statistics');
      mockStatisticService.getStatistic.mockRejectedValue(error);

      await expect(controller.getStatistic(mockRequest)).rejects.toThrow(
        'Failed to fetch statistics',
      );
      expect(service.getStatistic).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle user not found error', async () => {
      const error = new Error('User not found');
      mockStatisticService.getStatistic.mockRejectedValue(error);

      await expect(controller.getStatistic(mockRequest)).rejects.toThrow(
        'User not found',
      );
    });

    it('should return statistics with perfect completion rate', async () => {
      const perfectStats: StatisticDto = {
        totalGames: 10,
        completedGames: 10,
        completionRate: '100.0%',
        gamesByDifficulty: [
          { difficulty: 'EASY', count: 5 },
          { difficulty: 'MEDIUM', count: 3 },
          { difficulty: 'HARD', count: 2 },
        ],
        languageUsage: [ProgrammingLanguage.PYTHON, ProgrammingLanguage.JAVA],
        averageCompletionTimeMs: 120000,
        preferredLanguage: 'python',
      };
      mockStatisticService.getStatistic.mockResolvedValue(perfectStats);

      const result = await controller.getStatistic(mockRequest);

      expect(result.completionRate).toBe('100.0%');
      expect(result.completedGames).toBe(result.totalGames);
      expect(result.preferredLanguage).toBe('python');
    });

    it('should handle statistics with multiple languages', async () => {
      const multiLangStats: StatisticDto = {
        totalGames: 15,
        completedGames: 12,
        completionRate: '80.0%',
        gamesByDifficulty: [
          { difficulty: 'EASY', count: 8 },
          { difficulty: 'MEDIUM', count: 4 },
          { difficulty: 'HARD', count: 3 },
        ],
        languageUsage: [
          ProgrammingLanguage.TYPESCRIPT,
          ProgrammingLanguage.JAVASCRIPT,
          ProgrammingLanguage.PYTHON,
          ProgrammingLanguage.JAVA,
        ],
        averageCompletionTimeMs: 240000,
        preferredLanguage: 'typescript',
      };
      mockStatisticService.getStatistic.mockResolvedValue(multiLangStats);

      const result = await controller.getStatistic(mockRequest);

      expect(result.languageUsage).toHaveLength(4);
      expect(result.languageUsage).toContain(ProgrammingLanguage.TYPESCRIPT);
      expect(result.gamesByDifficulty).toHaveLength(3);
    });

    it('should handle fast completion times', async () => {
      const fastStats: StatisticDto = {
        totalGames: 5,
        completedGames: 4,
        completionRate: '80.0%',
        gamesByDifficulty: [{ difficulty: 'EASY', count: 5 }],
        languageUsage: [ProgrammingLanguage.TYPESCRIPT],
        averageCompletionTimeMs: 60000, // 1 minute
        preferredLanguage: 'typescript',
      };
      mockStatisticService.getStatistic.mockResolvedValue(fastStats);

      const result = await controller.getStatistic(mockRequest);

      expect(result.averageCompletionTimeMs).toBe(60000);
      expect(result.averageCompletionTimeMs).toBeLessThan(120000);
    });
  });
});

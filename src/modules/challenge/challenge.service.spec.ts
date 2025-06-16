import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { ChallengeService } from './challenge.service';

describe('ChallengeService', () => {
  let service: ChallengeService;
  let prismaService: PrismaService;

  const mockPrisma = {
    codeChallenge: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ChallengeService>(ChallengeService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findRandomChallenge', () => {
    const mockChallenge = {
      id: 'challenge-123',
      title: 'Two Sum',
      description:
        'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      difficulty: 'EASY',
      testCases: [
        {
          id: 1,
          description: 'Basic test case',
          inputs: { nums: [2, 7, 11, 15], target: 9 },
          expectedOutput: '[0,1]',
          hidden: false,
        },
      ],
      starterCode: 'function twoSum(nums, target) {\n    // Your code here\n}',
    };

    it('should return a challenge when challenge exists', async () => {
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        mockChallenge,
      );

      const result = await service.findRandomChallenge();

      expect(result).toEqual(mockChallenge);
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when no challenge found', async () => {
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findRandomChallenge()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findRandomChallenge()).rejects.toThrow(
        'No challenges found',
      );

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when challenge is undefined', async () => {
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        undefined,
      );

      await expect(service.findRandomChallenge()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findRandomChallenge()).rejects.toThrow(
        'No challenges found',
      );

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
    });

    it('should handle database connection errors', async () => {
      const databaseError = new Error('Database connection failed');
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockRejectedValue(
        databaseError,
      );

      await expect(service.findRandomChallenge()).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockRejectedValue(
        timeoutError,
      );

      await expect(service.findRandomChallenge()).rejects.toThrow(
        'Query timeout',
      );

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
    });

    it('should return challenge with minimal data structure', async () => {
      const minimalChallenge = {
        id: 'challenge-456',
        title: 'Simple Challenge',
        description: 'A simple challenge',
        difficulty: 'EASY',
        testCases: [],
        starterCode: '',
      };

      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        minimalChallenge,
      );

      const result = await service.findRandomChallenge();

      expect(result).toEqual(minimalChallenge);
      expect(result.id).toBe('challenge-456');
      expect(result.title).toBe('Simple Challenge');
      expect(result.description).toBe('A simple challenge');
      expect(result.difficulty).toBe('EASY');
    });

    it('should return challenge with complete data structure', async () => {
      const completeChallenge = {
        id: 'challenge-789',
        title: 'Complex Challenge',
        description: 'A complex algorithmic challenge',
        difficulty: 'HARD',
        testCases: [
          {
            id: 1,
            description: 'Complex test case',
            inputs: { input: 'complex input' },
            expectedOutput: 'expected result',
            hidden: false,
          },
        ],
        starterCode: 'function solve() { /* code */ }',
      };

      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        completeChallenge,
      );

      const result = await service.findRandomChallenge();

      expect(result).toEqual(completeChallenge);
      expect(result.id).toBe('challenge-789');
      expect(result.title).toBe('Complex Challenge');
      expect(result.description).toBe('A complex algorithmic challenge');
      expect(result.difficulty).toBe('HARD');
      expect(result.testCases).toHaveLength(1);
      expect(result.starterCode).toBe('function solve() { /* code */ }');
    });

    it('should use correct ordering parameters', async () => {
      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        mockChallenge,
      );

      await service.findRandomChallenge();

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });

      // Verify that the ordering is specifically ascending by id
      const callArgs = (mockPrisma.codeChallenge.findFirst as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.orderBy).toEqual({ id: 'asc' });
    });

    it('should handle prisma client errors gracefully', async () => {
      const prismaError = new Error('P2002: Unique constraint violation');
      prismaError.name = 'PrismaClientKnownRequestError';

      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockRejectedValue(
        prismaError,
      );

      await expect(service.findRandomChallenge()).rejects.toThrow(
        'P2002: Unique constraint violation',
      );

      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledWith({
        orderBy: {
          id: 'asc',
        },
      });
    });

    it('should handle unexpected data types gracefully', async () => {
      // Test with empty object but with required fields
      const emptyChallenge = {
        id: 'empty-challenge',
        title: '',
        description: '',
        difficulty: 'EASY',
        testCases: [],
        starterCode: '',
      };

      (mockPrisma.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
        emptyChallenge,
      );

      const result = await service.findRandomChallenge();

      expect(result).toMatchObject({
        id: 'empty-challenge',
        title: '',
        description: '',
        difficulty: 'EASY',
        testCases: [],
        starterCode: '',
      });
    });

    it('should maintain consistent behavior across multiple calls', async () => {
      const firstChallenge = { ...mockChallenge, id: 'challenge-001' };
      const secondChallenge = { ...mockChallenge, id: 'challenge-002' };

      (mockPrisma.codeChallenge.findFirst as jest.Mock)
        .mockResolvedValueOnce(firstChallenge)
        .mockResolvedValueOnce(secondChallenge);

      const firstResult = await service.findRandomChallenge();
      const secondResult = await service.findRandomChallenge();

      expect(firstResult.id).toBe('challenge-001');
      expect(secondResult.id).toBe('challenge-002');
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenCalledTimes(2);

      // Both calls should use the same parameters
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenNthCalledWith(1, {
        orderBy: { id: 'asc' },
      });
      expect(mockPrisma.codeChallenge.findFirst).toHaveBeenNthCalledWith(2, {
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('service structure', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have findRandomChallenge method', () => {
      expect(service.findRandomChallenge).toBeDefined();
      expect(typeof service.findRandomChallenge).toBe('function');
    });

    it('should have prisma service injected', () => {
      expect(service['prisma']).toBeDefined();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GameStatus } from '@prisma/client';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { GameDto } from './dto/game.dto';
import { GameController } from './game.controller';
import { GameService } from './game.service';

describe('GameController', () => {
  let controller: GameController;
  let service: GameService;

  const mockGameService = {
    joinOrCreateGame: jest.fn(),
  };

  const mockRequest: RequestWithAuth = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
  } as RequestWithAuth;

  const mockGameDto: GameDto = {
    id: 'game-123',
    status: GameStatus.PENDING,
    startsAt: new Date('2023-12-01T10:00:00Z'),
    participants: [],
    challenge: {
      id: 'challenge-1',
      title: 'Two Sum',
      description: 'Find two numbers that add up to target',
      difficulty: 'EASY',
      starterCode: 'function twoSum(nums, target) {\n  // Your code here\n}',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useValue: mockGameService,
        },
      ],
    })
      .overrideGuard(require('../../core/auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<GameController>(GameController);
    service = module.get<GameService>(GameService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGame', () => {
    it('should call joinOrCreateGame service method with correct user ID', async () => {
      mockGameService.joinOrCreateGame.mockResolvedValue(mockGameDto);

      const result = await controller.createGame(mockRequest);

      expect(service.joinOrCreateGame).toHaveBeenCalledWith('test-user-id');
      expect(service.joinOrCreateGame).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockGameDto);
    });

    it('should return game with PENDING status', async () => {
      const pendingGame = {
        ...mockGameDto,
        status: GameStatus.PENDING,
      };
      mockGameService.joinOrCreateGame.mockResolvedValue(pendingGame);

      const result = await controller.createGame(mockRequest);

      expect(result.status).toBe(GameStatus.PENDING);
      expect(result.id).toBe('game-123');
    });

    it('should return game with IN_PROGRESS status', async () => {
      const inProgressGame = {
        ...mockGameDto,
        status: GameStatus.IN_PROGRESS,
      };
      mockGameService.joinOrCreateGame.mockResolvedValue(inProgressGame);

      const result = await controller.createGame(mockRequest);

      expect(result.status).toBe(GameStatus.IN_PROGRESS);
    });

    it('should return game with COMPLETED status', async () => {
      const completedGame = {
        ...mockGameDto,
        status: GameStatus.COMPLETED,
      };
      mockGameService.joinOrCreateGame.mockResolvedValue(completedGame);

      const result = await controller.createGame(mockRequest);

      expect(result.status).toBe(GameStatus.COMPLETED);
    });

    it('should return game with CANCELLED status', async () => {
      const cancelledGame = {
        ...mockGameDto,
        status: GameStatus.CANCELLED,
      };
      mockGameService.joinOrCreateGame.mockResolvedValue(cancelledGame);

      const result = await controller.createGame(mockRequest);

      expect(result.status).toBe(GameStatus.CANCELLED);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Failed to create or join game');
      mockGameService.joinOrCreateGame.mockRejectedValue(error);

      await expect(controller.createGame(mockRequest)).rejects.toThrow(
        'Failed to create or join game',
      );
      expect(service.joinOrCreateGame).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle user not found error', async () => {
      const error = new Error('User not found');
      mockGameService.joinOrCreateGame.mockRejectedValue(error);

      await expect(controller.createGame(mockRequest)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle database connection error', async () => {
      const error = new Error('Database connection failed');
      mockGameService.joinOrCreateGame.mockRejectedValue(error);

      await expect(controller.createGame(mockRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle game capacity error', async () => {
      const error = new Error('Game is full');
      mockGameService.joinOrCreateGame.mockRejectedValue(error);

      await expect(controller.createGame(mockRequest)).rejects.toThrow(
        'Game is full',
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Invalid game parameters');
      mockGameService.joinOrCreateGame.mockRejectedValue(error);

      await expect(controller.createGame(mockRequest)).rejects.toThrow(
        'Invalid game parameters',
      );
    });

    it('should maintain proper request-response flow', async () => {
      const gameResponse = {
        ...mockGameDto,
        id: 'new-game-456',
        startsAt: new Date('2023-12-01T15:00:00Z'),
      };
      mockGameService.joinOrCreateGame.mockResolvedValue(gameResponse);

      const result = await controller.createGame(mockRequest);

      expect(result.id).toBe('new-game-456');
      expect(result.startsAt).toEqual(new Date('2023-12-01T15:00:00Z'));
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest: RequestWithAuth = {
        user: {
          id: 'different-user-id',
          email: 'different@example.com',
          username: 'differentuser',
        },
      } as RequestWithAuth;

      mockGameService.joinOrCreateGame.mockResolvedValue(mockGameDto);

      await controller.createGame(differentUserRequest);

      expect(service.joinOrCreateGame).toHaveBeenCalledWith(
        'different-user-id',
      );
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { GameStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChallengeService } from '../challenge/challenge.service';
import { GameService, MAX_LOBBY_SIZE } from './game.service';

describe('GameService', () => {
  let service: GameService;
  let prismaService: PrismaService;
  let challengeService: ChallengeService;

  const mockPrisma = {
    game: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    gameParticipant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockChallengeService = {
    findRandomChallenge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ChallengeService,
          useValue: mockChallengeService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prismaService = module.get<PrismaService>(PrismaService);
    challengeService = module.get<ChallengeService>(ChallengeService);

    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a new game', async () => {
      const challengeId = 'challenge-123';
      const mockGame = {
        id: 'game-123',
        challengeId,
        status: GameStatus.PENDING,
        startsAt: expect.any(Date),
        challenge: {
          id: challengeId,
          title: 'Test Challenge',
        },
        participants: [],
      };

      (prismaService.game.create as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.createGame(challengeId);

      expect(prismaService.game.create).toHaveBeenCalledWith({
        data: {
          challengeId,
          status: GameStatus.PENDING,
          startsAt: expect.any(Date),
        },
        include: {
          challenge: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
      });
      expect(result).toEqual(mockGame);
    });
  });

  describe('findGame', () => {
    it('should return game when found and user is participant', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const mockGame = {
        id: gameId,
        status: GameStatus.PENDING,
        challenge: { id: 'challenge-123' },
        participants: [
          {
            userId,
            user: { id: userId, username: 'testuser' },
          },
        ],
      };

      (prismaService.game.findFirst as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.findGame(gameId, userId);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(prismaService.game.findFirst).toHaveBeenCalledWith({
        where: {
          id: gameId,
        },
        include: {
          challenge: true,
          participants: {
            include: { user: true },
          },
        },
      });
    });

    it('should return error when game not found', async () => {
      (prismaService.game.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findGame('game-123', 'user-123');

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    });

    it('should return error when user is not participant', async () => {
      const mockGame = {
        id: 'game-123',
        status: GameStatus.PENDING,
        challenge: { id: 'challenge-123' },
        participants: [
          {
            userId: 'other-user',
            user: { id: 'other-user', username: 'otheruser' },
          },
        ],
      };

      (prismaService.game.findFirst as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.findGame('game-123', 'user-123');

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'PLAYER_NOT_IN_GAME',
        message: 'Player not in game',
      });
    });
  });

  describe('findGameByUserId', () => {
    it('should return game when found', async () => {
      const userId = 'user-123';
      const mockGameParticipant = {
        userId,
        game: {
          id: 'game-123',
          status: GameStatus.PENDING,
          participants: [
            {
              userId,
              user: { id: userId, username: 'testuser' },
            },
          ],
        },
      };

      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        mockGameParticipant,
      );

      const result = await service.findGameByUserId(userId);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error when no game found for user', async () => {
      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.findGameByUserId('user-123');

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    });
  });

  describe('startGame', () => {
    it('should start the game and update status', async () => {
      const gameId = 'game-123';
      const mockGame = {
        id: gameId,
        status: GameStatus.IN_PROGRESS,
        startsAt: new Date(),
        participants: [],
        challenge: { id: 'challenge-123' },
      };

      (prismaService.game.update as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.startGame(gameId);

      expect(result.ok).toBe(true);
      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: gameId },
        data: { status: GameStatus.IN_PROGRESS, startsAt: expect.any(Date) },
        include: {
          participants: {
            include: { user: true },
          },
          challenge: true,
        },
      });
    });
  });

  describe('submitCode', () => {
    it('should mark participant as completed', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const mockGame = {
        id: gameId,
        participants: [
          {
            id: 'participant-123',
            userId,
            isCompleted: false,
          },
          {
            id: 'participant-456',
            userId: 'user-456',
            isCompleted: false,
          },
        ],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameParticipant.update as jest.Mock).mockResolvedValue({});
      (prismaService.gameParticipant.findMany as jest.Mock).mockResolvedValue([
        { id: 'participant-123', userId, isCompleted: true },
        { id: 'participant-456', userId: 'user-456', isCompleted: false },
      ]);

      const result = await service.submitCode(gameId, userId, 100, 'code');

      expect(result.ok).toBe(true);
      expect(prismaService.gameParticipant.update).toHaveBeenCalledWith({
        where: { id: 'participant-123' },
        data: {
          isCompleted: true,
          completedAt: expect.any(Date),
          currentCode: 'code',
          percentage: 100,
        },
      });
    });

    it('should complete game when last player submits', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';

      const mockGame = {
        id: gameId,
        participants: [
          {
            id: 'participant-123',
            userId,
            isCompleted: false, // This player will be marked as completed
          },
          {
            id: 'participant-456',
            userId: 'user-456',
            isCompleted: true, // Already completed
          },
        ],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameParticipant.update as jest.Mock).mockResolvedValue({});
      (prismaService.gameParticipant.findMany as jest.Mock).mockResolvedValue([
        { id: 'participant-123', userId, isCompleted: true },
        { id: 'participant-456', userId: 'user-456', isCompleted: true },
      ]);
      (prismaService.game.update as jest.Mock).mockResolvedValue({});

      await service.submitCode(gameId, userId, 100, 'code');

      expect(prismaService.gameParticipant.update).toHaveBeenCalledWith({
        where: { id: 'participant-123' },
        data: {
          isCompleted: true,
          completedAt: expect.any(Date),
          currentCode: 'code',
          percentage: 100,
        },
      });
    });

    it('should return error when game not found', async () => {
      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.submitCode(
        'game-123',
        'user-123',
        100,
        'code',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    });

    it('should return error when player not in game', async () => {
      const mockGame = {
        id: 'game-123',
        participants: [
          {
            id: 'participant-456',
            userId: 'user-456',
            isCompleted: false,
          },
        ],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.submitCode(
        'game-123',
        'user-123',
        100,
        'code',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'PLAYER_NOT_IN_GAME',
        message: 'Player not in game',
      });
    });

    it('should return error when player already completed', async () => {
      const mockGame = {
        id: 'game-123',
        participants: [
          {
            id: 'participant-123',
            userId: 'user-123',
            isCompleted: true,
          },
        ],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await service.submitCode(
        'game-123',
        'user-123',
        100,
        'code',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'PLAYER_ALREADY_COMPLETED',
        message: 'Player already completed the game',
      });
    });
  });

  describe('leaveGame', () => {
    it('should remove participant and delete game if last player', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const mockGame = {
        id: gameId,
        participants: [
          {
            id: 'participant-123',
            userId,
            isHost: true,
          },
        ],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameParticipant.delete as jest.Mock).mockResolvedValue({});
      (prismaService.game.delete as jest.Mock).mockResolvedValue({});

      const result = await service.leaveGame(gameId, userId);

      expect(result.ok).toBe(true);
      expect(prismaService.gameParticipant.delete).toHaveBeenCalledWith({
        where: { gameId_userId: { gameId, userId } },
      });
      expect(prismaService.game.delete).toHaveBeenCalledWith({
        where: { id: gameId },
      });
    });

    it('should assign new host when host leaves but game continues', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const mockGame = {
        id: gameId,
        participants: [
          {
            id: 'participant-123',
            userId,
            isHost: true,
          },
          {
            id: 'participant-456',
            userId: 'user-456',
            isHost: false,
          },
        ],
      };

      const mockNextHost = {
        id: 'participant-456',
        gameId,
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameParticipant.delete as jest.Mock).mockResolvedValue({});
      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        mockNextHost,
      );
      (prismaService.gameParticipant.update as jest.Mock).mockResolvedValue({});

      const result = await service.leaveGame(gameId, userId);

      expect(result.ok).toBe(true);
      expect(prismaService.gameParticipant.update).toHaveBeenCalledWith({
        where: { id: 'participant-456' },
        data: { isHost: true },
      });
    });

    it('should return error when game not found', async () => {
      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.leaveGame('game-123', 'user-123');

      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
    });
  });

  describe('findActiveGameByUserId', () => {
    it('should return active game for user', async () => {
      const userId = 'user-123';
      const mockGameParticipant = {
        userId,
        game: {
          id: 'game-123',
          status: GameStatus.PENDING,
        },
      };

      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        mockGameParticipant,
      );

      const result = await service.findActiveGameByUserId(userId);

      expect(result).toEqual(mockGameParticipant.game);
      expect(prismaService.gameParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          game: {
            status: GameStatus.PENDING,
          },
        },
        include: {
          game: true,
        },
      });
    });

    it('should throw WsException when no active game found', async () => {
      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findActiveGameByUserId('user-123')).rejects.toThrow(
        WsException,
      );
    });
  });

  describe('joinOrCreateGame', () => {
    it('should return existing game if user already in one', async () => {
      const userId = 'user-123';
      const mockGameParticipant = {
        userId,
        game: {
          id: 'game-123',
          status: GameStatus.PENDING,
        },
      };

      (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
        mockGameParticipant,
      );

      const result = await service.joinOrCreateGame(userId);

      expect(result).toEqual(mockGameParticipant.game);
    });

    it('should join existing pending game if available', async () => {
      const userId = 'user-123';
      const mockExistingGame = {
        id: 'game-123',
        status: GameStatus.PENDING,
        participants: [
          {
            userId: 'user-456',
            user: { id: 'user-456' },
          },
        ],
        challenge: { id: 'challenge-123' },
      };

      (prismaService.gameParticipant.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No existing game for user
        .mockResolvedValueOnce(null); // For joinGame participant check
      (prismaService.game.findFirst as jest.Mock).mockResolvedValue(
        mockExistingGame,
      );
      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(
        mockExistingGame,
      );
      (prismaService.gameParticipant.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.gameParticipant.create as jest.Mock).mockResolvedValue({});

      const result = await service.joinOrCreateGame(userId);

      expect(result).toEqual(mockExistingGame);
      expect(prismaService.gameParticipant.create).toHaveBeenCalled();
    });

    it('should create new game if no existing game available', async () => {
      const userId = 'user-123';
      const mockChallenge = {
        id: 'challenge-123',
        title: 'Test Challenge',
      };
      const mockNewGame = {
        id: 'game-123',
        challengeId: 'challenge-123',
        status: GameStatus.PENDING,
        participants: [],
        challenge: mockChallenge,
      };

      (prismaService.gameParticipant.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No existing game for user
        .mockResolvedValueOnce(null); // For joinGame participant check
      (prismaService.game.findFirst as jest.Mock).mockResolvedValue(null);
      (mockChallengeService.findRandomChallenge as jest.Mock).mockResolvedValue(
        mockChallenge,
      );
      (prismaService.game.create as jest.Mock).mockResolvedValue(mockNewGame);
      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(
        mockNewGame,
      );
      (prismaService.gameParticipant.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.gameParticipant.create as jest.Mock).mockResolvedValue({});

      const result = await service.joinOrCreateGame(userId);

      expect(result).toEqual(mockNewGame);
      expect(mockChallengeService.findRandomChallenge).toHaveBeenCalled();
      expect(prismaService.game.create).toHaveBeenCalled();
    });
  });

  describe('private joinGame method (tested through integration)', () => {
    it('should throw NotFoundException when game not found', async () => {
      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service['joinGame']('game-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when game is not pending', async () => {
      const mockGame = {
        id: 'game-123',
        status: GameStatus.IN_PROGRESS,
        participants: [],
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      await expect(service['joinGame']('game-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when game is full', async () => {
      const mockGame = {
        id: 'game-123',
        status: GameStatus.PENDING,
        participants: new Array(MAX_LOBBY_SIZE).fill({ userId: 'user' }),
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      await expect(service['joinGame']('game-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user already joined', async () => {
      const mockGame = {
        id: 'game-123',
        status: GameStatus.PENDING,
        participants: [{ userId: 'user-456' }],
      };

      const mockParticipant = {
        id: 'participant-123',
        gameId: 'game-123',
        userId: 'user-123',
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameParticipant.findUnique as jest.Mock).mockResolvedValue(
        mockParticipant,
      );

      await expect(service['joinGame']('game-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

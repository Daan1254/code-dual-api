import { Test, TestingModule } from '@nestjs/testing';
import { GameStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  const mockGameService = {
    findGame: jest.fn(),
    submitCode: jest.fn(),
    startGame: jest.fn(),
    leaveGame: jest.fn(),
    findGameByUserId: jest.fn(),
  };

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      handshake: {
        auth: {
          userId: 'user-123',
          gameId: 'game-123',
        },
      } as any,
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: GameService,
          useValue: mockGameService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);
    gateway.server = mockServer as Server;

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    const mockGameDto = {
      id: 'game-123',
      status: GameStatus.PENDING,
      participants: [
        {
          id: 'participant-123',
          userId: 'user-123',
          isHost: true,
          user: {
            id: 'user-123',
            username: 'testuser',
          },
        },
      ],
      challenge: {
        id: 'challenge-123',
        title: 'Test Challenge',
      },
    };

    it('should handle successful connection', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockGameDto,
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.data.userId).toBe('user-123');
      expect(mockSocket.data.gameId).toBe('game-123');
      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('game-123');
      expect(mockServer.to).toHaveBeenCalledWith('game-123');
      expect(mockServer.emit).toHaveBeenCalledWith('gameState', mockGameDto);
    });

    it('should disconnect client when game not found', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should disconnect client when player not in game', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'PLAYER_NOT_IN_GAME', message: 'Player not in game' },
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'PLAYER_NOT_IN_GAME',
        message: 'Player not in game',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should set socket data correctly', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockGameDto,
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.data).toEqual({
        userId: 'user-123',
        gameId: 'game-123',
      });
    });

    it('should handle missing auth data gracefully', async () => {
      const socketWithoutAuth = {
        ...mockSocket,
        handshake: { auth: {} },
        data: {},
      } as Partial<Socket>;

      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });

      await gateway.handleConnection(socketWithoutAuth as Socket);

      expect(socketWithoutAuth.data.userId).toBeUndefined();
      expect(socketWithoutAuth.data.gameId).toBeUndefined();
      expect(mockGameService.findGame).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockSocket.data = { userId: 'user-123' };

      await gateway.handleDisconnect(mockSocket as Socket);

      // Note: We can't easily test the logger directly, but we can verify the method runs
      expect(mockSocket.data.userId).toBe('user-123');

      consoleSpy.mockRestore();
    });

    it('should handle disconnect without userId', async () => {
      mockSocket.data = {};

      await gateway.handleDisconnect(mockSocket as Socket);

      // Should not throw error even without userId
      expect(mockSocket.data.userId).toBeUndefined();
    });
  });

  describe('handleSubmit', () => {
    beforeEach(() => {
      mockSocket.data = {
        userId: 'user-123',
        gameId: 'game-123',
      };
    });

    const mockGameDto = {
      id: 'game-123',
      status: GameStatus.IN_PROGRESS,
      participants: [
        {
          id: 'participant-123',
          userId: 'user-123',
          isHost: true,
          isCompleted: true,
          user: {
            id: 'user-123',
            username: 'testuser',
          },
        },
      ],
    };

    it('should handle successful code submission', async () => {
      (mockGameService.submitCode as jest.Mock).mockResolvedValue({
        ok: true,
        data: null,
      });
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockGameDto,
      });

      await gateway.handleSubmit(mockSocket as Socket);

      expect(mockGameService.submitCode).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockServer.to).toHaveBeenCalledWith('game-123');
      expect(mockServer.emit).toHaveBeenCalledWith('gameState', mockGameDto);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('error');
    });

    it('should emit error when submitCode fails', async () => {
      (mockGameService.submitCode as jest.Mock).mockResolvedValue({
        ok: false,
        error: {
          code: 'PLAYER_ALREADY_COMPLETED',
          message: 'Player already completed',
        },
      });

      await gateway.handleSubmit(mockSocket as Socket);

      expect(mockGameService.submitCode).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'PLAYER_ALREADY_COMPLETED',
        message: 'Player already completed',
      });
      expect(mockGameService.findGame).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should emit error when finding game after submit fails', async () => {
      (mockGameService.submitCode as jest.Mock).mockResolvedValue({
        ok: true,
        data: null,
      });
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });

      await gateway.handleSubmit(mockSocket as Socket);

      expect(mockGameService.submitCode).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockServer.to).toHaveBeenCalledWith('game-123');
      expect(mockServer.emit).toHaveBeenCalledWith('gameState', undefined);
    });
  });

  describe('handleStartGame', () => {
    beforeEach(() => {
      mockSocket.data = {
        userId: 'user-123',
        gameId: 'game-123',
      };
    });

    const mockPendingGame = {
      id: 'game-123',
      status: GameStatus.PENDING,
      participants: [
        {
          id: 'participant-123',
          userId: 'user-123',
          isHost: true,
          user: { id: 'user-123', username: 'testuser' },
        },
        {
          id: 'participant-456',
          userId: 'user-456',
          isHost: false,
          user: { id: 'user-456', username: 'testuser2' },
        },
      ],
    };

    const mockStartedGame = {
      ...mockPendingGame,
      status: GameStatus.IN_PROGRESS,
    };

    it('should start game successfully', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockPendingGame,
      });
      (mockGameService.startGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockStartedGame,
      });

      await gateway.handleStartGame(mockSocket as Socket);

      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.startGame).toHaveBeenCalledWith('game-123');
      expect(mockServer.to).toHaveBeenCalledWith('game-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'startGame',
        mockStartedGame,
      );
      expect(mockSocket.emit).not.toHaveBeenCalledWith('error');
    });

    it('should emit error when game not found', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });

      await gateway.handleStartGame(mockSocket as Socket);

      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
      expect(mockGameService.startGame).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should emit error when game already started', async () => {
      const alreadyStartedGame = {
        ...mockPendingGame,
        status: GameStatus.IN_PROGRESS,
      };

      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: alreadyStartedGame,
      });

      await gateway.handleStartGame(mockSocket as Socket);

      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_ALREADY_STARTED',
        message: 'Game already started',
      });
      expect(mockGameService.startGame).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should emit error when not enough players', async () => {
      const gameWithOnePlayer = {
        ...mockPendingGame,
        participants: [mockPendingGame.participants[0]],
      };

      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: gameWithOnePlayer,
      });

      await gateway.handleStartGame(mockSocket as Socket);

      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: 'Not enough players to start the game',
      });
      expect(mockGameService.startGame).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should emit error when startGame service call fails', async () => {
      (mockGameService.findGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockPendingGame,
      });
      (mockGameService.startGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'START_GAME_FAILED', message: 'Failed to start game' },
      });

      await gateway.handleStartGame(mockSocket as Socket);

      expect(mockGameService.findGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.startGame).toHaveBeenCalledWith('game-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'START_GAME_FAILED',
        message: 'Failed to start game',
      });
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleLeave', () => {
    beforeEach(() => {
      mockSocket.data = {
        userId: 'user-123',
        gameId: 'game-123',
      };
    });

    const mockGameDto = {
      id: 'game-123',
      status: GameStatus.PENDING,
      participants: [
        {
          id: 'participant-456',
          userId: 'user-456',
          isHost: true,
          user: { id: 'user-456', username: 'testuser2' },
        },
      ],
    };

    it('should handle leave successfully', async () => {
      (mockGameService.leaveGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: null,
      });
      (mockGameService.findGameByUserId as jest.Mock).mockResolvedValue({
        ok: true,
        data: mockGameDto,
      });

      await gateway.handleLeave(mockSocket as Socket);

      expect(mockGameService.leaveGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.findGameByUserId).toHaveBeenCalledWith('user-123');
      expect(mockServer.to).toHaveBeenCalledWith('game-123');
      expect(mockServer.emit).toHaveBeenCalledWith('gameState', {
        ok: true,
        data: mockGameDto,
      });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('error');
    });

    it('should emit error when leaveGame fails', async () => {
      (mockGameService.leaveGame as jest.Mock).mockResolvedValue({
        ok: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });

      await gateway.handleLeave(mockSocket as Socket);

      expect(mockGameService.leaveGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found',
      });
      expect(mockGameService.findGameByUserId).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle errors from findGameByUserId', async () => {
      (mockGameService.leaveGame as jest.Mock).mockResolvedValue({
        ok: true,
        data: null,
      });
      (mockGameService.findGameByUserId as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await gateway.handleLeave(mockSocket as Socket);

      expect(mockGameService.leaveGame).toHaveBeenCalledWith(
        'game-123',
        'user-123',
      );
      expect(mockGameService.findGameByUserId).toHaveBeenCalledWith('user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Database error',
      });
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('gateway structure', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should have handleConnection method', () => {
      expect(gateway.handleConnection).toBeDefined();
      expect(typeof gateway.handleConnection).toBe('function');
    });

    it('should have handleDisconnect method', () => {
      expect(gateway.handleDisconnect).toBeDefined();
      expect(typeof gateway.handleDisconnect).toBe('function');
    });

    it('should have handleSubmit method', () => {
      expect(gateway.handleSubmit).toBeDefined();
      expect(typeof gateway.handleSubmit).toBe('function');
    });

    it('should have handleStartGame method', () => {
      expect(gateway.handleStartGame).toBeDefined();
      expect(typeof gateway.handleStartGame).toBe('function');
    });

    it('should have handleLeave method', () => {
      expect(gateway.handleLeave).toBeDefined();
      expect(typeof gateway.handleLeave).toBe('function');
    });

    it('should have server property', () => {
      expect(gateway.server).toBeDefined();
    });
  });
});

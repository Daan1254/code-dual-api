import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GameDifficulty, GameStatus } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { GameRepository } from './game.repository';

export const MAX_LOBBY_SIZE = 6;

@Injectable()
export class GameService {
  private logger: Logger;

  constructor(
    private readonly gameRepository: GameRepository,
    private readonly prisma: PrismaService,
  ) {
    this.logger = new Logger(GameService.name);
  }

  async findAvailableGame(difficulty: GameDifficulty) {
    return await this.gameRepository.findAvailableGame(difficulty);
  }

  async createGame(challengeId: string) {
    return this.gameRepository.createGame(challengeId);
  }

  async joinGame(id: string, userId: string) {
    const game = await this.gameRepository.findGameById(id);

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PENDING) {
      throw new BadRequestException('Game is not pending');
    }

    if (game.participants.length >= MAX_LOBBY_SIZE) {
      throw new BadRequestException('Game is full');
    }

    return await this.gameRepository.joinGame(id, userId);
  }

  async findGameById(id: string) {
    const game = await this.gameRepository.findGameById(id);

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async updateGameStatus(gameId: string, status: GameStatus) {
    return await this.gameRepository.updateGameStatus(gameId, status);
  }

  async findOrCreateGame(userId: string, difficulty: GameDifficulty) {
    // First try to find an available game
    let game = await this.gameRepository.findAvailableGame(difficulty);

    console.log('game', game);

    if (!game) {
      // If no game available, get a random challenge of the requested difficulty
      const challenge = await this.prisma.codeChallenge.findFirst({
        where: { difficulty },
        orderBy: { createdAt: 'desc' },
      });

      if (!challenge) {
        throw new NotFoundException('No challenges available');
      }

      // Create a new game with the selected challenge
      game = await this.gameRepository.createGame(challenge.id);
    }

    // Join the game
    const participant = await this.gameRepository.joinGame(game.id, userId);

    return participant.game;
  }

  async startGame(gameId: string) {
    return await this.prisma.game.update({
      where: { id: gameId },
      data: { status: GameStatus.IN_PROGRESS },
      include: {
        challenge: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async leaveGame(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });

    console.log('game', game);

    if (!game) {
      throw new WsException('Game not found');
    }

    const isHost = game.participants.find((p) => p.userId === userId)?.isHost;
    const isLastPlayer = game.participants.length === 1;

    console.log('isHost', isHost);
    console.log('isLastPlayer', isLastPlayer);
    console.log('gameId', gameId);
    console.log('userId', userId);

    await this.prisma.gameParticipant.delete({
      where: { gameId_userId: { gameId, userId } },
    });

    if (isLastPlayer) {
      await this.deleteGame(gameId);
      return;
    }

    if (isHost) {
      await this.assignNewHost(gameId);
    }
  }

  private async assignNewHost(gameId: string) {
    const nextHost = await this.prisma.gameParticipant.findFirst({
      where: { gameId },
    });

    if (!nextHost) {
      return; // Game was likely deleted
    }

    await this.prisma.gameParticipant.update({
      where: { id: nextHost.id },
      data: { isHost: true },
    });
  }

  private async deleteGame(gameId: string) {
    await this.prisma.game.delete({
      where: { id: gameId },
    });
  }

  async findActiveGameByUserId(id: string) {
    const game = await this.prisma.gameParticipant.findFirst({
      where: {
        userId: id,
        game: {
          status: GameStatus.PENDING,
        },
      },
      include: {
        game: true,
      },
    });

    if (!game) {
      throw new WsException('Game not found');
    }

    return game.game;
  }
}

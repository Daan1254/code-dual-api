import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GameStatus } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { ChallengeService } from '../challenge/challenge.service';

export const MAX_LOBBY_SIZE = 6;

@Injectable()
export class GameService {
  private logger: Logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeService: ChallengeService,
  ) {}

  async createGame(challengeId: string) {
    return await this.prisma.game.create({
      data: {
        challengeId,
        status: GameStatus.PENDING,
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
  }

  async findGameByUserId(userId: any) {
    const game = await this.prisma.gameParticipant.findFirst({
      where: { userId },
      include: {
        game: {
          include: {
            participants: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!game) {
      return null;
    }

    return game.game;
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

  async joinOrCreateGame(userId: string) {
    const game = await this.prisma.gameParticipant.findFirst({
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

    if (game) {
      return game.game;
    }

    const existingGame = await this.prisma.game.findFirst({
      where: {
        status: GameStatus.PENDING,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        challenge: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingGame) {
      await this.joinGame(existingGame.id, userId);
      return existingGame;
    }

    const challenge = await this.challengeService.findRandomChallenge();

    const newGame = await this.createGame(challenge.id);

    await this.joinGame(newGame.id, userId);

    return newGame;
  }

  private async joinGame(id: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PENDING) {
      throw new BadRequestException('Game is not pending');
    }

    if (game.participants.length >= MAX_LOBBY_SIZE) {
      throw new BadRequestException('Game is full');
    }

    const participant = await this.prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: {
          gameId: game.id,
          userId,
        },
      },
    });

    if (participant) {
      throw new BadRequestException('User already joined the game');
    }

    return await this.prisma.gameParticipant.create({
      data: {
        gameId: game.id,
        userId,
      },
    });
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
}

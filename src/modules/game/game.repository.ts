import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { GameDifficulty, GameStatus } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableGame(difficulty: GameDifficulty) {
    return await this.prisma.game.findFirst({
      where: {
        status: GameStatus.PENDING,
        challenge: {
          difficulty,
        },
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
  }

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

  async joinGame(gameId: string, userId: string) {
    console.log('joinGame', gameId, userId);
    const [game, user] = await Promise.all([
      this.prisma.game.findUnique({
        where: { id: gameId },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
      }),
    ]);

    if (!game) {
      throw new WsException('Game not found');
    }

    if (!user) {
      throw new WsException('User not found');
    }

    const participant = await this.prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
      },
      include: {
        game: {
          include: {
            challenge: true,
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return participant;
  }

  async findGameById(id: string) {
    return await this.prisma.game.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async updateGameStatus(gameId: string, status: GameStatus) {
    return await this.prisma.game.update({
      where: { id: gameId },
      data: { status },
    });
  }
}

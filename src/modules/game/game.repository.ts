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
    const [game, user] = await Promise.all([
      this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          participants: true,
        },
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

    const existingParticipant = await this.prisma.gameParticipant.findFirst({
      where: {
        gameId,
        userId,
      },
    });

    if (existingParticipant) {
      throw new WsException('User already joined the game');
    }

    const participant = await this.prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
        isHost: game.participants.length === 0,
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

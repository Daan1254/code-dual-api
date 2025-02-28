import { Injectable } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableGame() {
    return await this.prisma.game.findFirst({
      where: {
        status: GameStatus.PENDING,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async joinGame(gameId: string, userId: string) {
    return await this.prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
      },
    });
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

  async createGame() {
    return await this.prisma.game.create({
      data: {
        status: GameStatus.PENDING,
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

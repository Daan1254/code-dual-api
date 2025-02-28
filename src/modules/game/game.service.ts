import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { GameRepository } from './game.repository';

export const MAX_LOBBY_SIZE = 6;

@Injectable()
export class GameService {
  private logger: Logger;

  constructor(private readonly gameRepository: GameRepository) {
    this.logger = new Logger(GameService.name);
  }

  async findAvailableGame() {
    return await this.gameRepository.findAvailableGame();
  }

  async createGame() {
    return this.gameRepository.createGame();
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
}

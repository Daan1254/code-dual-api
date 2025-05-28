import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { GameStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@Injectable()
@WebSocketGateway(80, {
  namespace: 'game',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger(GameGateway.name);

  constructor(private gameService: GameService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    const gameId = client.handshake.auth.gameId;
    client.data.userId = userId;
    client.data.gameId = gameId;

    this.logger.log(`Client connected: ${userId}`);

    const game = await this.gameService.findGame(gameId, userId);

    if (!game.ok) {
      client.emit('error', { ...game.error });
      client.disconnect();
      return;
    }

    client.join(game.data.id);

    this.server.to(game.data.id).emit('gameState', game.data);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data.userId}`);
  }

  @SubscribeMessage('submit')
  async handleSubmit(@ConnectedSocket() client: Socket) {
    const result = await this.gameService.submitCode(
      client.data.gameId,
      client.data.userId,
    );

    if (!result.ok) {
      client.emit('error', { ...result.error });
      return;
    }

    const game = await this.gameService.findGame(
      client.data.gameId,
      client.data.userId,
    );

    this.server.to(client.data.gameId).emit('gameState', game.data);
  }

  @SubscribeMessage('startGame')
  async handleStartGame(@ConnectedSocket() client: Socket) {
    const findGameResult = await this.gameService.findGame(
      client.data.gameId,
      client.data.userId,
    );

    if (!findGameResult.ok) {
      client.emit('error', { ...findGameResult.error });
      return;
    }

    const game = findGameResult.data;

    if (game.status !== GameStatus.PENDING) {
      client.emit('error', {
        code: 'GAME_ALREADY_STARTED',
        message: 'Game already started',
      });
      return;
    }

    if (game.participants.length < 2) {
      client.emit('error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: 'Not enough players to start the game',
      });
      return;
    }

    const startGameResult = await this.gameService.startGame(game.id);

    if (!startGameResult.ok) {
      client.emit('error', { ...startGameResult.error });
      return;
    }

    this.server.to(game.id).emit('startGame', startGameResult.data);
  }

  @SubscribeMessage('leave')
  async handleLeave(@ConnectedSocket() client: Socket) {
    try {
      const result = await this.gameService.leaveGame(
        client.data.gameId,
        client.data.userId,
      );

      if (!result.ok) {
        client.emit('error', { ...result.error });
        return;
      }

      const game = await this.gameService.findGameByUserId(client.data.userId);

      this.server.to(client.data.gameId).emit('gameState', game);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { GameDifficulty } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService, MAX_LOBBY_SIZE } from './game.service';

@Injectable()
@WebSocketGateway(80, {
  namespace: 'game',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private logger: Logger;

  constructor(private gameService: GameService) {
    this.logger = new Logger(GameGateway.name);
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; difficulty: GameDifficulty },
  ) {
    console.log('joinQueue', payload);

    try {
      const game = await this.gameService.findOrCreateGame(
        payload.userId,
        payload.difficulty,
      );

      // Join socket room
      client.join(game.id);

      // Notify all players in the lobby
      this.server.to(game.id).emit('playerJoined', game);

      // If lobby is full, start the game
      if (game.participants.length === MAX_LOBBY_SIZE) {
        await this.gameService.startGame(game.id);

        this.server.to(game.id).emit('gameStart', game);
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to join queue' });
      console.error('Queue join error:', error);
    }
  }

  @SubscribeMessage('leaveQueue')
  async handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    try {
      // Find user's pending game
      console.log('leaveQueue', payload);
      const game = await this.gameService.findActiveGameByUserId(
        payload.userId,
      );

      console.log('game', game);
      if (!game) {
        throw new WsException('Player is not in a game');
      }

      client.leave(game.id);
      await this.gameService.leaveGame(game.id, payload.userId);

      const updatedGame = await this.gameService.findGameById(game.id);

      this.server.to(game.id).emit('playerLeft', updatedGame);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
}

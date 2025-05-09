import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
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

  private logger: Logger;

  constructor(private gameService: GameService) {
    this.logger = new Logger(GameGateway.name);
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    client.data.userId = userId;

    this.logger.log(`Client connected: ${userId}`);

    const game = await this.gameService.findGameByUserId(userId);

    if (!game) {
      client.emit('error', { message: 'PLAYER_NOT_IN_GAME' });
      client.disconnect();
      return;
    }

    client.data.gameId = game.id;

    client.emit('gameState', game);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data.userId}`);
  }

  // @SubscribeMessage('leaveQueue')
  // async handleLeaveQueue(
  //   @ConnectedSocket() client: Socket,
  //   @MessageBody() payload: { userId: string },
  // ) {
  //   try {
  //     // Find user's pending game
  //     console.log('leaveQueue', payload);
  //     const game = await this.gameService.findActiveGameByUserId(
  //       payload.userId,
  //     );

  //     console.log('game', game);
  //     if (!game) {
  //       throw new WsException('Player is not in a game');
  //     }

  //     client.leave(game.id);
  //     await this.gameService.leaveGame(game.id, payload.userId);

  //     const updatedGame = await this.gameService.findGameById(game.id);

  //     this.server.to(game.id).emit('playerLeft', updatedGame);
  //   } catch (error) {
  //     client.emit('error', { message: error.message });
  //   }
  // }
}

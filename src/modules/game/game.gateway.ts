import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { GameStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { GameService, MAX_LOBBY_SIZE } from './game.service';

@Injectable()
@WebSocketGateway(80, {
  namespace: 'game',
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
    payload: { userId: string; preferredLanguage: string },
  ) {
    this.logger.log(`User ${payload.userId} joined queue`);
    try {
      // Find an available lobby (PENDING game with less than MAX_LOBBY_SIZE players)
      const pendingGame = await this.gameService.findAvailableGame();
      let gameId: string;
      if (pendingGame) {
        // Join existing game
        await this.gameService.joinGame(pendingGame.id, payload.userId);
        gameId = pendingGame.id;
        // Get updated participant count
        const updatedGame = await this.gameService.findGameById(gameId);
        // Join socket room
        client.join(gameId);
        // Notify all players in the lobby about the new player
        this.server.to(gameId).emit('playerJoined', {
          gameId,
          playerCount: updatedGame.participants.length,
          players: updatedGame.participants.map((p) => ({
            userId: p.userId,
            username: p.user.username,
          })),
        });
        // If lobby is full, start the game
        if (updatedGame?.participants.length === MAX_LOBBY_SIZE) {
          this.logger.log(`Game ${gameId} is full, starting game`);
          await this.gameService.updateGameStatus(
            gameId,
            GameStatus.IN_PROGRESS,
          );
          this.server.to(gameId).emit('gameStart', {
            gameId,
            players: updatedGame.participants.map((p) => ({
              userId: p.userId,
              username: p.user.username,
            })),
          });
        }
      } else {
        // Create new game/lobby
        const newGame = await this.gameService.createGame();
        this.logger.log(`Game ${newGame.id} created`);
        await this.gameService.joinGame(newGame.id, payload.userId);
        const updatedGame = await this.gameService.findGameById(newGame.id);
        gameId = updatedGame.id;
        // Join socket room
        client.join(gameId);
        // Notify player they're waiting for others
        client.emit('waitingForPlayers', {
          gameId,
          playerCount: 1,
          players: updatedGame.participants.map((p) => ({
            userId: p.userId,
            username: p.user.username,
          })),
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to join queue' });
      console.error('Queue join error:', error);
    }
  }

  //   @IsAuthenticated()
  //   @SubscribeMessage('leaveQueue')
  //   async handleLeaveQueue(
  //     @ConnectedSocket() client: Socket,
  //     payload: { userId: string },
  //   ) {
  //     try {
  //       // Find user's pending game
  //       const gameParticipant = await this.prisma.gameParticipant.findFirst({
  //         where: {
  //           userId: payload.userId,
  //           game: {
  //             status: 'PENDING',
  //           },
  //         },
  //         include: {
  //           game: {
  //             include: {
  //               participants: {
  //                 include: {
  //                   user: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       });

  //       if (gameParticipant) {
  //         const gameId = gameParticipant.gameId;

  //         // Remove participant
  //         await this.prisma.gameParticipant.delete({
  //           where: {
  //             id: gameParticipant.id,
  //           },
  //         });

  //         // Check remaining participants
  //         const remainingParticipants = await this.prisma.gameParticipant.count({
  //           where: { gameId },
  //         });

  //         if (remainingParticipants === 0) {
  //           // If no players left, cancel the game
  //           await this.prisma.game.update({
  //             where: { id: gameId },
  //             data: { status: 'CANCELLED' },
  //           });
  //         } else {
  //           // Notify remaining players
  //           this.server.to(gameId).emit('playerLeft', {
  //             gameId,
  //             playerCount: remainingParticipants,
  //             userId: payload.userId,
  //           });
  //         }

  //         // Leave socket room
  //         client.leave(gameId);

  //         // Notify client
  //         client.emit('queueLeft');
  //       }
  //     } catch (error) {
  //       client.emit('error', { message: 'Failed to leave queue' });
  //       console.error('Queue leave error:', error);
  //     }
  //   }
}

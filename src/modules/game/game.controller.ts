import { Controller, Post, Req } from '@nestjs/common';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('join')
  @IsAuthenticated()
  async joinQueue(@Req() req: RequestWithAuth) {
    return this.gameService.joinQueue(req.user.id);
  }
}

import { Controller, Post, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from '../../core/auth/auth.decorator';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { GameDto } from './dto/game.dto';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  @IsAuthenticated()
  @ApiOkResponse({
    type: GameDto,
  })
  async createGame(@Req() req: RequestWithAuth) {
    return await this.gameService.joinOrCreateGame(req.user.id);
  }
}

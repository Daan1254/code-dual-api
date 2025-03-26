import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { GameDto } from './dto/game.dto';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':id')
  @IsAuthenticated()
  @ApiOkResponse({
    type: GameDto,
  })
  async getGame(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.gameService.findGameById(id);
  }
}

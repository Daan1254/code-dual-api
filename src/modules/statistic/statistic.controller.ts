import { Controller, Get, Req } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { StatisticDto } from './dto/statistic.dto';
import { StatisticService } from './statistic.service';

@Controller('statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get()
  @IsAuthenticated()
  @ApiResponse({
    status: 200,
    description: 'Get the statistic of the user',
    type: StatisticDto,
  })
  async getStatistic(@Req() req: RequestWithAuth) {
    return this.statisticService.getStatistic(req.user.id);
  }
}

import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from '../../core/auth/auth.decorator';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { UserDto } from '../../core/auth/dto/user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @IsAuthenticated()
  @ApiOkResponse({
    description: 'Get the current user',
    type: UserDto,
  })
  getProfile(@Req() req: RequestWithAuth) {
    return this.userService.getProfile(req.user.id);
  }
}

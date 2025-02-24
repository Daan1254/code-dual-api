import { Controller, Get, Req } from '@nestjs/common';
import { ApiHeader, ApiOkResponse } from '@nestjs/swagger';
import { IsAuthenticated } from 'src/core/auth/auth.decorator';
import { RequestWithAuth } from 'src/core/auth/auth.guard';
import { UserDto } from 'src/core/auth/dto/user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @IsAuthenticated()
  @ApiHeader({
    name: 'Authorization',
    description: 'The token of the user',
  })
  @ApiOkResponse({
    description: 'Get the current user',
    type: UserDto,
  })
  getMe(@Req() req: RequestWithAuth) {
    return req.user;
  }
}

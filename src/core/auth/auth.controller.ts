import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AccessTokenDto } from './dto/access-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOkResponse({
    description: 'Login to the application',
    type: AccessTokenDto,
  })
  async signIn(@Body() body: SignInDto): Promise<{ access_token: string }> {
    return await this.authService.signIn(body);
  }

  @Post('register')
  @ApiOkResponse({
    description: 'Register to the application',
    type: AccessTokenDto,
  })
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }
}

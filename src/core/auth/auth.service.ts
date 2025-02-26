import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(body: SignInDto): Promise<{ access_token: string }> {
    const user = await this.userService.getUserByEmail(body.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await compare(body.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = { ...user, password: undefined };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(body: RegisterDto) {
    const user = await this.userService.getUserByEmail(body.email);

    if (user) {
      throw new BadRequestException('User already exists');
    }

    if (body.password !== body.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const userNameAvailable = await this.userService.isUsernameAvailable(
      body.username,
    );

    if (!userNameAvailable) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await hash(body.password, 10);

    const newUser = await this.userService.createUser({
      ...body,
      password: hashedPassword,
    });

    return {
      access_token: await this.jwtService.signAsync(newUser),
    };
  }
}

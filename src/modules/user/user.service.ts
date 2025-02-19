import { Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/core/auth/dto/register.dto';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(body: RegisterDto) {
    return this.prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
        username: body.username,
      },
    });
  }

  async isUsernameAvailable(username: string) {
    return (await this.prisma.user.count({ where: { username } })) === 0;
  }
}

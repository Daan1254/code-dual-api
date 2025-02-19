import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

@Exclude()
export class SignInDto {
  @Expose()
  @ApiProperty({
    example: 'daan@code-duel.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'Test123!',
    description: 'The password of the user',
  })
  password: string;
}

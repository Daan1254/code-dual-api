import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

@Exclude()
export class RegisterDto extends SignInDto {
  @Expose()
  @IsString()
  @ApiProperty({
    example: 'Daan',
    description: 'The username of the user',
  })
  username: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'Test123!',
    description: 'The password of the user',
  })
  passwordConfirmation: string;
}

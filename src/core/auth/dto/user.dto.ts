import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { SubscriptionDto } from 'src/modules/subscription/dto/subscription.dto';

@Exclude()
export class UserDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the user',
  })
  id: string;

  @Expose()
  @ApiProperty({
    example: 'John Doe',
    description: 'The username of the user',
  })
  username: string;

  @Expose()
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The subscription of the user',
    nullable: true,
  })
  @Type(() => SubscriptionDto)
  subscription?: SubscriptionDto;
}

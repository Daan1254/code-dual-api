import { ApiProperty } from '@nestjs/swagger';
import { ProgrammingLanguage } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { UserDto } from '../../../core/auth/dto/user.dto';

@Exclude()
export class GameParticipantDto {
  @ApiProperty({
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    type: UserDto,
  })
  @Expose()
  user: UserDto;

  @ApiProperty({
    type: String,
  })
  @Expose()
  currentCode: string;

  @ApiProperty({
    type: Boolean,
  })
  @Expose()
  isCompleted: boolean;

  @ApiProperty({
    type: Date,
  })
  @Expose()
  completedAt: Date;

  @ApiProperty({
    enum: ProgrammingLanguage,
  })
  @Expose()
  language: ProgrammingLanguage;

  @ApiProperty({
    type: Boolean,
  })
  @Expose()
  isHost: boolean;
}

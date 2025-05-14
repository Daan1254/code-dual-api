import { ApiProperty } from '@nestjs/swagger';
import { GameDifficulty } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsEnum, IsString, IsUUID } from 'class-validator';

@Exclude()
export class ChallengeDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({
    enum: GameDifficulty,
  })
  @IsEnum(GameDifficulty)
  difficulty: GameDifficulty;

  @ApiProperty()
  @IsString()
  starterCode: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { CodeChallenge, GameDifficulty } from '@prisma/client';
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

  static fromDb(challenge: CodeChallenge): ChallengeDto {
    const dto = new ChallengeDto();
    dto.id = challenge.id;
    dto.title = challenge.title;
    dto.description = challenge.description;
    dto.difficulty = challenge.difficulty;
    dto.starterCode = challenge.starterCode;
    return dto;
  }
}

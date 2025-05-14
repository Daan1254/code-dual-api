import { ApiProperty } from '@nestjs/swagger';
import { GameStatus } from '@prisma/client';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { ChallengeDto } from 'src/modules/challenge/dto/challenge.dto';
import { GameParticipantDto } from 'src/modules/game-participant/dto/game-participant.dto';

@Exclude()
export class GameDto {
  @ApiProperty({
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    enum: GameStatus,
  })
  @Expose()
  status: GameStatus;

  @ApiProperty({
    type: GameParticipantDto,
    isArray: true,
  })
  @Expose()
  participants: GameParticipantDto[];

  @ApiProperty({
    type: Date,
  })
  @Expose()
  startsAt: Date;

  @ApiProperty({
    type: ChallengeDto,
  })
  @Expose()
  challenge: ChallengeDto;

  static fromDb(game: any): GameDto {
    return plainToInstance(GameDto, game);
  }
}

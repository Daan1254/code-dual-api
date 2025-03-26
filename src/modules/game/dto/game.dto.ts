import { ApiProperty } from '@nestjs/swagger';
import { GameStatus } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { GameParticipantDto } from 'src/modules/game-participant/dto/game-participant.dto';

@Exclude()
export class GameDto {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({
    enum: GameStatus,
  })
  status: GameStatus;

  @ApiProperty({
    type: GameParticipantDto,
    isArray: true,
  })
  participants: GameParticipantDto[];
}

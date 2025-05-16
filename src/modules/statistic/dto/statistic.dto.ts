import { ApiProperty } from '@nestjs/swagger';
import { GameDifficulty, ProgrammingLanguage } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
@Exclude()
export class GameDifficultyDto {
  @ApiProperty({
    description: 'The difficulty level of the game',
    example: 'EASY',
  })
  @Expose()
  difficulty: GameDifficulty;

  @ApiProperty({
    description: 'The number of games played at this difficulty level',
    example: 10,
  })
  @Expose()
  count: number;
}

export class StatisticDto {
  @ApiProperty({
    description: 'Total number of games the user has participated in',
    example: 10,
  })
  totalGames: number;

  @ApiProperty({
    description: 'Number of games the user has completed',
    example: 7,
  })
  completedGames: number;

  @ApiProperty({
    description: 'Completion rate as a percentage string',
    example: '70.0%',
  })
  completionRate: string;

  @ApiProperty({
    description: 'Number of games played by difficulty level',
    type: GameDifficultyDto,
    isArray: true,
  })
  gamesByDifficulty: GameDifficultyDto[];

  @ApiProperty({
    description: 'Record of programming languages used and their frequency',
    example: [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.JAVASCRIPT,
      ProgrammingLanguage.JAVA,
    ],
  })
  languageUsage: ProgrammingLanguage[];

  @ApiProperty({
    description: 'Average time taken to complete games in milliseconds',
    example: 150000,
  })
  averageCompletionTimeMs: number;

  @ApiProperty({
    description: "User's preferred programming language",
    example: 'python',
  })
  preferredLanguage: string;
}

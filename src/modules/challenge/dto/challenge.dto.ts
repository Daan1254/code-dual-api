import { ApiProperty } from '@nestjs/swagger';
import { GameDifficulty } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class TestCaseDto {
  @ApiProperty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  inputs: Record<string, any>;

  @ApiProperty()
  @IsString()
  @Expose()
  expectedOutput: string;

  @ApiProperty()
  @Expose()
  hidden: boolean;
}

@Exclude()
export class ChallengeDto {
  @ApiProperty()
  @IsUUID()
  @Expose()
  id: string;

  @ApiProperty()
  @IsString()
  @Expose()
  title: string;

  @ApiProperty()
  @IsString()
  @Expose()
  description: string;

  @ApiProperty({
    enum: GameDifficulty,
  })
  @IsEnum(GameDifficulty)
  @Expose()
  difficulty: GameDifficulty;

  @ApiProperty()
  @IsString()
  @Expose()
  starterCode: string;

  @ApiProperty({ type: [TestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  @Expose()
  testCases: TestCaseDto[];
}

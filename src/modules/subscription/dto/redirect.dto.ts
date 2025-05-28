import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RedirectDto {
  @ApiProperty()
  @Expose()
  url: string;
}

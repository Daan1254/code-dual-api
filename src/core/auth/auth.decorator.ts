import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from './auth.guard';


export function IsAuthenticated() {
  return applyDecorators(
    UseGuards(AuthGuard)
  );
}

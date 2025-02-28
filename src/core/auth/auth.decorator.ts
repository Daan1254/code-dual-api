import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';

export function IsAuthenticated() {
  return applyDecorators(UseGuards(AuthGuard), ApiBearerAuth());
}

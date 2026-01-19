import { Controller, Get, Post, Body, Request, Param } from '@nestjs/common';
import { AltanService } from './altan.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { TransferAltanDto } from './dto/transfer-altan.dto';

@Controller('altan')
export class AltanController {
  constructor(private altanService: AltanService) {}

  @Get('balance')
  getBalance(@Request() req: AuthenticatedRequest) {
    return this.altanService.getBalance(req.user.id);
  }

  @Get('history')
  getHistory(@Request() req: AuthenticatedRequest) {
    return this.altanService.getHistory(req.user.id);
  }

  @Get('resolve/:identifier')
  resolveUser(@Param('identifier') identifier: string) {
    return this.altanService.resolveUser(identifier);
  }

  @Post('transfer')
  transfer(@Body() dto: TransferAltanDto, @Request() req: AuthenticatedRequest) {
    return this.altanService.transfer(req.user.id, dto.recipientId, dto.amount);
  }
}

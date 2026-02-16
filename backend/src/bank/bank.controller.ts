import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { BankAuthGuard, BankAuthenticatedRequest } from './bank-auth.guard';
import { BankTransferDto } from './dto/bank-transfer.dto';

/**
 * Bank Controller.
 *
 * All endpoints require a valid bank ticket (NOT auth JWT).
 * Responses use bankRef — NEVER userId or personal identity data.
 *
 * INSTITUTIONAL FIREWALL:
 * - Auth JWT will be REJECTED here
 * - Only bank tickets (from POST /bank/auth/ticket) are accepted
 */
@ApiTags('Bank')
@Controller('bank/me')
@UseGuards(BankAuthGuard)
export class BankController {
  constructor(private bankService: BankService) {}

  /**
   * GET /bank/me/balance
   * Returns balance for the authenticated bank account.
   */
  @Get('balance')
  async getBalance(@Req() req: BankAuthenticatedRequest) {
    const result = await this.bankService.getBalance(req.bankUser.bankRef);
    return { ok: true, ...result };
  }

  /**
   * GET /bank/me/history
   * Returns transaction history for the authenticated bank account.
   * All entries use bankRef pairs — no userId leakage.
   */
  @Get('history')
  async getHistory(
    @Req() req: BankAuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    const transactions = await this.bankService.getHistory(
      req.bankUser.bankRef,
      parsedLimit,
    );
    return { ok: true, transactions };
  }

  /**
   * POST /bank/me/transfer
   * Transfer funds to another bankRef.
   * Includes 0.03% fee to INOMAD INC.
   */
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Req() req: BankAuthenticatedRequest,
    @Body() dto: BankTransferDto,
  ) {
    const result = await this.bankService.transfer(
      req.bankUser.bankRef,
      dto.recipientBankRef,
      dto.amount,
      dto.memo,
    );
    return { ok: true, ...result };
  }

  /**
   * GET /bank/me/resolve?bankRef=xxx
   * Check if a recipient bankRef exists and is active.
   */
  @Get('resolve')
  async resolve(@Query('bankRef') bankRef: string) {
    if (!bankRef) {
      return { ok: false, exists: false };
    }
    const result = await this.bankService.resolveBankRef(bankRef);
    return { ok: true, ...result };
  }
}

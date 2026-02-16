import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BankAuthService } from './bank-auth.service';
import { BankNonceDto, BankTicketDto } from './dto/bank-ticket.dto';

/**
 * Bank Auth Controller.
 *
 * Provides separate authentication for banking operations.
 * These endpoints are PUBLIC — they verify identity independently
 * through wallet signature + on-chain SeatSBT check.
 *
 * FIREWALL: These endpoints do NOT accept or validate auth JWTs.
 * A separate wallet signature is required.
 */
@ApiTags('Banking')
@Controller('bank/auth')
export class BankAuthController {
  constructor(private bankAuthService: BankAuthService) {}

  /**
   * POST /bank/auth/nonce
   * Generate a bank-specific nonce challenge.
   * The signing message is different from auth: "Bank of Siberia: ${nonce}"
   */
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  async requestNonce(@Body() dto: BankNonceDto) {
    return this.bankAuthService.generateNonce(dto.address);
  }

  /**
   * POST /bank/auth/ticket
   * Verify bank-specific wallet signature, check SeatSBT on-chain,
   * and issue a short-lived bank ticket.
   *
   * Requires a separate signature (not reusable from auth login).
   */
  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  async issueTicket(@Body() dto: BankTicketDto) {
    const result = await this.bankAuthService.issueTicket(
      dto.address,
      dto.signature,
      dto.nonce,
    );
    return { ok: true, ...result };
  }
}

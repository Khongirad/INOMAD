import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Bank Fee Service.
 *
 * Computes the 0.03% infrastructure fee on transfers.
 * Fee is credited to INOMAD INC's bankRef.
 *
 * PRIVACY: Fee records use bankRef only — no userId, no seatId.
 * INOMAD INC receives aggregated fee amounts without knowing
 * who paid, to whom, or for what.
 */
@Injectable()
export class BankFeeService {
  private readonly logger = new Logger(BankFeeService.name);
  private readonly feeBps: number; // basis points (3 = 0.03%)
  private readonly inomadBankRef: string;

  constructor(private configService: ConfigService) {
    this.feeBps = this.configService.get<number>('FEE_BPS') || 3;
    this.inomadBankRef = this.configService.get<string>('INOMAD_FEE_BANK_REF') || '';

    if (!this.inomadBankRef) {
      this.logger.warn('INOMAD_FEE_BANK_REF not configured. Fees will not be collected.');
    }
  }

  /**
   * Compute fee amount for a given transfer.
   * Returns 0 if fee is below minimum precision.
   */
  computeFee(amount: number): number {
    if (amount <= 0) return 0;
    const fee = (amount * this.feeBps) / 10000;
    // Round to 6 decimal places (ALTAN precision)
    return Math.round(fee * 1000000) / 1000000;
  }

  /**
   * Get the INOMAD INC bankRef for fee collection.
   */
  getInomadBankRef(): string {
    return this.inomadBankRef;
  }

  /**
   * Check if fee collection is enabled.
   */
  isEnabled(): boolean {
    return !!this.inomadBankRef;
  }
}

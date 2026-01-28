import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { BankAuthController } from './bank-auth.controller';
import { BankAuthService } from './bank-auth.service';
import { BankAuthGuard } from './bank-auth.guard';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { BankFeeService } from './bank-fee.service';
import { BankRewardService } from './bank-reward.service';
import { BankBlockchainService } from './bank-blockchain.service';

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 300;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 300;
  }
}

/**
 * Banking Module — Fourth Branch of Power.
 *
 * INSTITUTIONAL FIREWALL RULES:
 * 1. This module NEVER imports AuthModule, UsersModule, or IdentityModule
 * 2. Uses its own JWT secret (BANK_JWT_SECRET), separate from AUTH_JWT_SECRET
 * 3. Verifies SeatSBT ownership independently on-chain
 * 4. All logging uses bankRef only — NEVER userId
 * 5. BankService is NOT exported — no other module can inject it
 * 6. Compromise of the political auth layer does NOT compromise banking
 *
 * Allowed imports: ConfigModule, PrismaModule (for financial tables only)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BlockchainModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // SEPARATE secret from auth JWT — this is the banking secret
        secret: configService.get<string>('BANK_JWT_SECRET') || 'dev-bank-secret-change-me',
        signOptions: {
          expiresIn: parseExpiryToSeconds(configService.get<string>('BANK_TICKET_EXPIRY') || '5m'),
        },
      }),
    }),
  ],
  controllers: [BankAuthController, BankController],
  providers: [
    BankAuthService,
    BankAuthGuard,
    BankService,
    BankFeeService,
    BankRewardService,
    BankBlockchainService,
  ],
  // Export ONLY BankRewardService — limited to system-initiated transfers.
  // BankService (balance, history, user transfers) is NEVER exported.
  exports: [BankRewardService],
})
export class BankModule {}

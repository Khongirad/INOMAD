import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { ArchiveModule } from '../archive/archive.module';
import { CentralBankController } from './central-bank.controller';
import { CentralBankService } from './central-bank.service';
import {  CentralBankAuthService } from './central-bank-auth.service';
import { CentralBankAuthGuard } from './central-bank-auth.guard';
import { CBWorkflowService } from './cb-workflow.service';

/**
 * Central Bank Module — Fourth Branch of Power (Apex).
 *
 * INSTITUTIONAL FIREWALL RULES:
 * 1. NEVER imports AuthModule, UsersModule, IdentityModule, or BankModule
 * 2. Uses its own JWT secret: CB_JWT_SECRET (distinct from BANK_JWT_SECRET and AUTH_JWT_SECRET)
 * 3. Verifies CB officer registry independently
 * 4. All logging uses officer wallet address — NEVER userId
 * 5. NOTHING is exported — complete isolation
 * 6. Compromise of bank or political layer does NOT compromise central bank
 *
 * Allowed imports: ConfigModule, PrismaModule (for CB tables only), JwtModule, VerificationModule (for emission limits), ArchiveModule (for formal documents)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    VerificationModule, // For tiered verification emission limits
    ArchiveModule, // For formal CB documents (licenses, protocols, agreements)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('CB_JWT_SECRET') || 'dev-cb-secret-change-me',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [CentralBankController],
  providers: [
    CentralBankService,
    CentralBankAuthService,
    CentralBankAuthGuard,
    CBWorkflowService,
  ],
  exports: [CentralBankAuthService], // Export auth service for Distribution guards only
})
export class CentralBankModule {}

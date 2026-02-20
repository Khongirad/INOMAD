import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { ArchiveModule } from '../archive/archive.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CentralBankController } from './central-bank.controller';
import { CentralBankService } from './central-bank.service';
import { CentralBankAuthService } from './central-bank-auth.service';
import { CentralBankAuthGuard } from './central-bank-auth.guard';
import { CBWorkflowService } from './cb-workflow.service';
import { EmissionProposalService } from './emission-proposal.service';
import { BalanceReconciliationService } from './balance-reconciliation.service';

/**
 * Central Bank Module — Fourth Branch of Power (Apex).
 *
 * INSTITUTIONAL FIREWALL RULES:
 * 1. NEVER imports AuthModule, UsersModule, IdentityModule, or BankModule
 * 2. Uses its own JWT secret: CB_JWT_SECRET (distinct from BANK_JWT_SECRET and AUTH_JWT_SECRET)
 * 3. Verifies CB officer registry independently
 * 4. All logging uses officer wallet address — NEVER userId
 * 5. Compromise of bank or political layer does NOT compromise central bank
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BlockchainModule,
    VerificationModule,
    ArchiveModule,
    ScheduleModule.forRoot(), // For BalanceReconciliationService 6h cron
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
    EmissionProposalService,
    BalanceReconciliationService,
  ],
  exports: [CentralBankAuthService, EmissionProposalService, BalanceReconciliationService],
})
export class CentralBankModule {}

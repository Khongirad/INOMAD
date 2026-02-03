import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { EventIndexerService } from './event-indexer.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { WalletProtectionService } from './wallet-protection.service';
import { WalletProtectionController } from './wallet-protection.controller';

/**
 * WalletProtectionModule - Hybrid Security System
 * 
 * Components:
 * - EventIndexer: Real-time blockchain event listener
 * - RiskScorer: Pattern detection and scoring
 * - AlertService: Notification management
 * - WalletProtection: Orchestrator and on-chain interaction
 */
@Module({
  imports: [ConfigModule, BlockchainModule],
  providers: [
    EventIndexerService,
    RiskScorerService,
    AlertService,
    WalletProtectionService,
  ],
  controllers: [WalletProtectionController],
  exports: [WalletProtectionService, RiskScorerService, AlertService],
})
export class WalletProtectionModule {}

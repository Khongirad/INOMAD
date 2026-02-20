import { Module, forwardRef } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { CreatorBootstrapService } from './creator-bootstrap.service';
import { TieredVerificationService } from './tiered-verification.service';
import { OnChainVerificationService } from './on-chain-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TimelineModule } from '../timeline/timeline.module';
import { DistributionModule } from '../distribution/distribution.module';
import { DistributionService } from '../distribution/distribution.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TimelineModule,
    BlockchainModule,                      // needed by DistributionService and OnChainVerificationService
    forwardRef(() => DistributionModule),  // Avoid circular dependency
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    CreatorBootstrapService,
    TieredVerificationService,
    DistributionService,
    OnChainVerificationService,
  ],
  exports: [VerificationService, CreatorBootstrapService, TieredVerificationService, OnChainVerificationService],
})
export class VerificationModule {}

import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { FounderService } from './founder.service';
import { CitizenDistributionService } from './citizen-distribution.service';
import { SovereignFundService } from './sovereign-fund.service';
import { IdentityController } from './identity.controller';
import { FounderController } from './founder.controller';
import { DistributionController } from './distribution.controller';
import { SovereignFundController } from './sovereign-fund.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  providers: [RegistrationService, VerificationService, IdentityBlockchainService, FounderService, CitizenDistributionService, SovereignFundService],
  controllers: [IdentityController, FounderController, DistributionController, SovereignFundController],
  exports: [RegistrationService, VerificationService, IdentityBlockchainService, FounderService, CitizenDistributionService, SovereignFundService],
})
export class IdentityModule {}


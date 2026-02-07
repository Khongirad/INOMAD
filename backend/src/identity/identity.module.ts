import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { FounderService } from './founder.service';
import { CitizenDistributionService } from './citizen-distribution.service';
import { SovereignFundService } from './sovereign-fund.service';
import { CitizenAllocationService } from './citizen-allocation.service';
import { UBISchedulerService } from './ubi-scheduler.service';
import { IdentityController } from './identity.controller';
import { FounderController } from './founder.controller';
import { DistributionController } from './distribution.controller';
import { SovereignFundController } from './sovereign-fund.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [PrismaModule, BlockchainModule, BankModule, ScheduleModule.forRoot()],
  providers: [
    RegistrationService,
    VerificationService,
    IdentityBlockchainService,
    FounderService,
    CitizenDistributionService,
    SovereignFundService,
    CitizenAllocationService,
    UBISchedulerService,
  ],
  controllers: [IdentityController, FounderController, DistributionController, SovereignFundController],
  exports: [RegistrationService, VerificationService, IdentityBlockchainService, FounderService, CitizenDistributionService, SovereignFundService, CitizenAllocationService],
})
export class IdentityModule {}


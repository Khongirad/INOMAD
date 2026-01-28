import { Module, Global } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ContractAddressesService } from './contract-addresses.service';
import { E2ETestService } from './e2e-test.service';
import { E2ETestController } from './e2e-test.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [E2ETestController],
  providers: [BlockchainService, ContractAddressesService, E2ETestService],
  exports: [BlockchainService, ContractAddressesService, E2ETestService],
})
export class BlockchainModule {}

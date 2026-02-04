import { Module } from '@nestjs/common';
// import { CouncilOfJusticeService } from './justice.service';
// import { JusticeController } from './justice.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [],
  // providers: [CouncilOfJusticeService],  // Disabled - service file renamed
  // exports: [CouncilOfJusticeService],  // Disabled - service file renamed
})
export class JusticeModule {}

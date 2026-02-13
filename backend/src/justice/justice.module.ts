import { Module } from '@nestjs/common';
import { CouncilOfJusticeService } from './justice.service';
import { JusticeController } from './justice.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, BlockchainModule, AuthModule],
  controllers: [JusticeController],
  providers: [CouncilOfJusticeService],
  exports: [CouncilOfJusticeService],
})
export class JusticeModule {}

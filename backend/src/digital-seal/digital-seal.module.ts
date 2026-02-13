import { Module } from '@nestjs/common';
import { DigitalSealController } from './digital-seal.controller';
import { DigitalSealService } from './digital-seal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, BlockchainModule, AuthModule],
  controllers: [DigitalSealController],
  providers: [DigitalSealService],
  exports: [DigitalSealService],
})
export class DigitalSealModule {}

import { Module } from '@nestjs/common';
import { TempleOfHeavenService } from './temple.service';
import { TempleController } from './temple.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [TempleController],
  providers: [TempleOfHeavenService],
  exports: [TempleOfHeavenService],
})
export class TempleModule {}

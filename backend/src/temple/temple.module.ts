import { Module } from '@nestjs/common';
import { TempleOfHeavenService } from './temple.service';
import { TempleController } from './temple.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, BlockchainModule, AuthModule],
  controllers: [TempleController],
  providers: [TempleOfHeavenService],
  exports: [TempleOfHeavenService],
})
export class TempleModule {}

import { Module } from '@nestjs/common';
import { MPCWalletService } from './mpc-wallet.service';
import { MPCWalletController } from './mpc-wallet.controller';
import { KeyShareService } from './key-share.service';
import { RecoveryService } from './recovery.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MPCWalletController],
  providers: [MPCWalletService, KeyShareService, RecoveryService],
  exports: [MPCWalletService, KeyShareService],
})
export class MPCWalletModule {}

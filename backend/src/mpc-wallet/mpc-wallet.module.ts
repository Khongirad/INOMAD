import { Module } from '@nestjs/common';
import { MPCWalletService } from './mpc-wallet.service';
import { MPCWalletController } from './mpc-wallet.controller';
import { KeyShareService } from './key-share.service';
import { RecoveryService } from './recovery.service';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MPCWalletController],
  providers: [MPCWalletService, KeyShareService, RecoveryService, NotificationService],
  exports: [MPCWalletService, KeyShareService],
})
export class MPCWalletModule {}

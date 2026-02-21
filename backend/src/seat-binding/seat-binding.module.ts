import { Module } from '@nestjs/common';
import { SeatBindingController } from './seat-binding.controller';
import { SeatBindingService } from './seat-binding.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BlockchainModule, AuthModule],
  controllers: [SeatBindingController],
  providers: [SeatBindingService],
  exports: [SeatBindingService],
})
export class SeatBindingModule {}

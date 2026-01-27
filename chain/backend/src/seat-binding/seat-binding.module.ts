import { Module } from '@nestjs/common';
import { SeatBindingController } from './seat-binding.controller';
import { SeatBindingService } from './seat-binding.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [SeatBindingController],
  providers: [SeatBindingService],
  exports: [SeatBindingService],
})
export class SeatBindingModule {}

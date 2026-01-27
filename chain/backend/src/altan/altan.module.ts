import { Module } from '@nestjs/common';
import { AltanController } from './altan.controller';
import { AltanService } from './altan.service';
import { SeatBindingModule } from '../seat-binding/seat-binding.module';

@Module({
  imports: [SeatBindingModule],
  controllers: [AltanController],
  providers: [AltanService],
  exports: [AltanService],
})
export class AltanModule {}

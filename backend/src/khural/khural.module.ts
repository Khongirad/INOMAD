import { Module } from '@nestjs/common';
import { KhuralController } from './khural.controller';
import { KhuralService } from './khural.service';

@Module({
  controllers: [KhuralController],
  providers: [KhuralService],
  exports: [KhuralService],
})
export class KhuralModule {}

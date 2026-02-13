import { Module } from '@nestjs/common';
import { KhuralGateway } from './khural.gateway';

@Module({
  providers: [KhuralGateway],
  exports: [KhuralGateway],
})
export class RealtimeModule {}

import { Module } from '@nestjs/common';
import { ZagsServiceService } from './zags-service.service';
import { ZagsServiceController } from './zags-service.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ZagsServiceController],
  providers: [ZagsServiceService],
  exports: [ZagsServiceService],
})
export class ZagsServiceModule {}

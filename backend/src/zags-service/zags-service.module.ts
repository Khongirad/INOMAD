import { Module } from '@nestjs/common';
import { ZagsServiceService } from './zags-service.service';
import { ZagsServiceController } from './zags-service.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ZagsServiceController],
  providers: [ZagsServiceService],
  exports: [ZagsServiceService],
})
export class ZagsServiceModule {}

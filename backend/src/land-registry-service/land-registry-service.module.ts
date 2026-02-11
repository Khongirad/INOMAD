import { Module } from '@nestjs/common';
import { LandRegistryServiceService } from './land-registry-service.service';
import { LandRegistryServiceController } from './land-registry-service.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LandRegistryServiceController],
  providers: [LandRegistryServiceService],
  exports: [LandRegistryServiceService],
})
export class LandRegistryServiceModule {}

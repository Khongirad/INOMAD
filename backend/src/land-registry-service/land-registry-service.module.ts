import { Module } from '@nestjs/common';
import { LandRegistryServiceService } from './land-registry-service.service';
import { LandRegistryServiceController } from './land-registry-service.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LandRegistryServiceController],
  providers: [LandRegistryServiceService],
  exports: [LandRegistryServiceService],
})
export class LandRegistryServiceModule {}

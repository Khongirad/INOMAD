import { Module } from '@nestjs/common';
import { MigrationServiceService } from './migration-service.service';
import { MigrationServiceController } from './migration-service.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MigrationServiceController],
  providers: [MigrationServiceService],
  exports: [MigrationServiceService],
})
export class MigrationServiceModule {}

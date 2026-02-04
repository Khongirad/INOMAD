import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-migration';
import { PassportController } from './controllers/passport.controller';
import { PassportApplicationService } from './services/passport-application.service';
import { DocumentStorageService } from './services/document-storage.service';
import { AccessControlService } from './services/access-control.service';
import { WarrantService } from './services/warrant.service';

@Module({
  providers: [
    {
      provide: 'MIGRATION_PRISMA',
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
    PassportApplicationService,
    DocumentStorageService,
    AccessControlService,
    WarrantService,
  ],
  controllers: [PassportController],
  exports: ['MIGRATION_PRISMA', PassportApplicationService],
})
export class MigrationServiceModule {}

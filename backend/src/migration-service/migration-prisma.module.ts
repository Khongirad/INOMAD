import { Module, Global } from '@nestjs/common';
import { PrismaClient as MigrationPrismaClient } from '@prisma/client-migration';

@Global()
@Module({
  providers: [
    {
      provide: 'MIGRATION_PRISMA',
      useFactory: () => {
        const prisma = new MigrationPrismaClient({
          datasources: {
            db: {
              url: process.env.MIGRATION_SERVICE_DATABASE_URL,
            },
          },
        });
        return prisma;
      },
    },
  ],
  exports: ['MIGRATION_PRISMA'],
})
export class MigrationPrismaModule {}

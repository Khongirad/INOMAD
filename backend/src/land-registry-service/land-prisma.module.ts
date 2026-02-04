import { Module, Global } from '@nestjs/common';
import { PrismaClient as LandPrismaClient } from '@prisma/client-land';

@Global()
@Module({
  providers: [
    {
      provide: 'LAND_PRISMA',
      useFactory: () => {
        const prisma = new LandPrismaClient({
          datasources: {
            db: {
              url: process.env.LAND_REGISTRY_DATABASE_URL,
            },
          },
        });
        return prisma;
      },
    },
  ],
  exports: ['LAND_PRISMA'],
})
export class LandPrismaModule {}

import { Module, Global } from '@nestjs/common';
import { PrismaClient as ZagsPrismaClient } from '@prisma/client-zags';

@Global()
@Module({
  providers: [
    {
      provide: 'ZAGS_PRISMA',
      useFactory: () => {
        const prisma = new ZagsPrismaClient({
          datasources: {
            db: {
              url: process.env.ZAGS_SERVICE_DATABASE_URL,
            },
          },
        });
        return prisma;
      },
    },
  ],
  exports: ['ZAGS_PRISMA'],
})
export class ZagsPrismaModule {}

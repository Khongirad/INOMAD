import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-land';
import { CadastralController } from './controllers/cadastral.controller';
import { PropertyController } from './controllers/property.controller';
import { CadastralMapService } from './services/cadastral-map.service';
import { OwnershipService } from './services/ownership.service';
import { TransferService } from './services/transfer.service';
import { ValuationService } from './services/valuation.service';

@Module({
  providers: [
    {
      provide: 'LAND_PRISMA',
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
    CadastralMapService,
    OwnershipService,
    TransferService,
    ValuationService,
  ],
  controllers: [CadastralController, PropertyController],
  exports: ['LAND_PRISMA', OwnershipService],
})
export class LandRegistryServiceModule {}

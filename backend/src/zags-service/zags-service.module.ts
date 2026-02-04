import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-zags';
import { MarriageController } from './controllers/marriage.controller';
import { MarriageRegistrationService } from './services/marriage-registration.service';
import { ConsentService } from './services/consent.service';
import { EligibilityService } from './services/eligibility.service';
import { CertificateService } from './services/certificate.service';

@Module({
  providers: [
    {
      provide: 'ZAGS_PRISMA',
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
    MarriageRegistrationService,
    ConsentService,
    EligibilityService,
    CertificateService,
  ],
  controllers: [MarriageController],
  exports: ['ZAGS_PRISMA', MarriageRegistrationService],
})
export class ZagsServiceModule {}

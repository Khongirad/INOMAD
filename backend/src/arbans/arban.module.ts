import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';
import { FamilyArbanService } from './family-arban.service';
import { ZunService } from './zun.service';
import { OrganizationalArbanService } from './organizational-arban.service';
import { CreditService } from './credit.service';
import { BankHierarchyService } from './bank-hierarchy.service';
import { ArbanVerificationService } from './arban-verification.service';
import { FamilyArbanController } from './family-arban.controller';
import { ZunController } from './zun.controller';
import { OrganizationalArbanController } from './organizational-arban.controller';
import { CreditController } from './credit.controller';
import { BankHierarchyController } from './bank-hierarchy.controller';
import { ArbanVerificationController } from './arban-verification.controller';

@Module({
  imports: [PrismaModule, AuthModule, VerificationModule],
  controllers: [
    FamilyArbanController,
    ZunController,
    OrganizationalArbanController,
    CreditController,
    BankHierarchyController,
    ArbanVerificationController,
  ],
  providers: [
    FamilyArbanService,
    ZunService,
    OrganizationalArbanService,
    CreditService,
    BankHierarchyService,
    ArbanVerificationService,
  ],
  exports: [
    FamilyArbanService,
    ZunService,
    OrganizationalArbanService,
    CreditService,
    BankHierarchyService,
    ArbanVerificationService,
  ],
})
export class ArbanModule {}

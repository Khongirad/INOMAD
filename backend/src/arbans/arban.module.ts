import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';
import { IdentityModule } from '../identity/identity.module';
// import { FamilyArbanService } from './family-arban.service';  // Disabled: requires blockchain
import { ZunService } from './zun.service';
import { OrganizationalArbanService } from './organizational-arban.service';
import { CreditService } from './credit.service';
import { BankHierarchyService } from './bank-hierarchy.service';
import { ArbanVerificationService } from './arban-verification.service';
// import { FamilyArbanController } from './family-arban.controller';  // Disabled: requires blockchain
import { ZunController } from './zun.controller';
import { OrganizationalArbanController } from './organizational-arban.controller';
import { CreditController } from './credit.controller';
import { BankHierarchyController } from './bank-hierarchy.controller';
import { ArbanVerificationController } from './arban-verification.controller';

@Module({
  imports: [PrismaModule, AuthModule, VerificationModule, IdentityModule],
  controllers: [
    // FamilyArbanController,  // Disabled
    ZunController,
    OrganizationalArbanController,
    CreditController,
    BankHierarchyController,
    ArbanVerificationController,
  ],
  providers: [
    // FamilyArbanService,  // Disabled
    ZunService,
    OrganizationalArbanService,
    CreditService,
    BankHierarchyService,
    ArbanVerificationService,
  ],
  exports: [
    // FamilyArbanService,  // Disabled
    ZunService,
    OrganizationalArbanService,
    CreditService,
    BankHierarchyService,
    ArbanVerificationService,
  ],
})
export class ArbanModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';
import { IdentityModule } from '../identity/identity.module';
// import { FamilyArbadService } from './family-arbad.service';  // Disabled: requires blockchain
import { ZunService } from './zun.service';
import { OrganizationalArbadService } from './organizational-arbad.service';
import { CreditService } from './credit.service';
import { BankHierarchyService } from './bank-hierarchy.service';
import { ArbadVerificationService } from './arbad-verification.service';
// import { FamilyArbadController } from './family-arbad.controller';  // Disabled: requires blockchain
import { ZunController } from './zun.controller';
import { OrganizationalArbadController } from './organizational-arbad.controller';
import { CreditController } from './credit.controller';
import { BankHierarchyController } from './bank-hierarchy.controller';
import { ArbadVerificationController } from './arbad-verification.controller';

@Module({
  imports: [PrismaModule, AuthModule, VerificationModule, IdentityModule],
  controllers: [
    // FamilyArbadController,  // Disabled
    ZunController,
    OrganizationalArbadController,
    CreditController,
    BankHierarchyController,
    ArbadVerificationController,
  ],
  providers: [
    // FamilyArbadService,  // Disabled
    ZunService,
    OrganizationalArbadService,
    CreditService,
    BankHierarchyService,
    ArbadVerificationService,
  ],
  exports: [
    // FamilyArbadService,  // Disabled
    ZunService,
    OrganizationalArbadService,
    CreditService,
    BankHierarchyService,
    ArbadVerificationService,
  ],
})
export class ArbadModule {}

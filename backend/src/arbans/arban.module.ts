import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyArbanService } from './family-arban.service';
import { ZunService } from './zun.service';
import { OrganizationalArbanService } from './organizational-arban.service';
import { CreditService } from './credit.service';
import { FamilyArbanController } from './family-arban.controller';
import { ZunController } from './zun.controller';
import { OrganizationalArbanController } from './organizational-arban.controller';
import { CreditController } from './credit.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    FamilyArbanController,
    ZunController,
    OrganizationalArbanController,
    CreditController,
  ],
  providers: [
    FamilyArbanService,
    ZunService,
    OrganizationalArbanService,
    CreditService,
  ],
  exports: [
    FamilyArbanService,
    ZunService,
    OrganizationalArbanService,
    CreditService,
  ],
})
export class ArbanModule {}

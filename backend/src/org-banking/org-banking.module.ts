import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgBankingService } from './org-banking.service';
import { OrgBankingController } from './org-banking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrgBankingController],
  providers: [OrgBankingService],
  exports: [OrgBankingService],
})
export class OrgBankingModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgBankingService } from './org-banking.service';
import { OrgBankingController } from './org-banking.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrgBankingController],
  providers: [OrgBankingService],
  exports: [OrgBankingService],
})
export class OrgBankingModule {}

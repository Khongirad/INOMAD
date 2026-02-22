import { Module } from '@nestjs/common';
import { LegalContractService } from './legal-contract.service';
import { LegalContractController } from './legal-contract.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LegalContractController],
  providers: [LegalContractService],
  exports: [LegalContractService],
})
export class LegalContractModule {}

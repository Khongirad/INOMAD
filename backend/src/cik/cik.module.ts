import { Module } from '@nestjs/common';
import { CIKService } from './cik.service';
import { CIKController } from './cik.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CIKController],
  providers: [CIKService],
  exports: [CIKService],
})
export class CIKModule {}

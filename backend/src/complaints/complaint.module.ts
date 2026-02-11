import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';

@Module({
  imports: [PrismaModule],
  providers: [ComplaintService],
  controllers: [ComplaintController],
  exports: [ComplaintService],
})
export class ComplaintModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkActService } from './work-act.service';
import { WorkActController } from './work-act.controller';

@Module({
  imports: [PrismaModule],
  providers: [WorkActService],
  controllers: [WorkActController],
  exports: [WorkActService],
})
export class WorkActModule {}

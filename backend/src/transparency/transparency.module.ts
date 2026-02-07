import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { TemplateService } from './template.service';
import { TransparencyService } from './transparency.service';
import { ActivityController } from './activity.controller';
import { TransparencyController } from './transparency.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService, TemplateService, TransparencyService],
  controllers: [ActivityController, TransparencyController],
  exports: [ActivityLogService, TemplateService, TransparencyService],
})
export class TransparencyModule {}

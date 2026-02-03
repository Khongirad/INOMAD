import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentModule } from '../documents/document.module';
import { TimelineModule } from '../timeline/timeline.module';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [DocumentModule, TimelineModule, ReputationModule],
  controllers: [QuestController],
  providers: [QuestService, PrismaService],
  exports: [QuestService],
})
export class QuestModule {}

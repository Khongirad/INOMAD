import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
// import { DocumentModule } from '../documents/document.module'; // Disabled - replaced by State Archive
import { TimelineModule } from '../timeline/timeline.module';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [AuthModule, /* DocumentModule, */ TimelineModule, ReputationModule],
  controllers: [QuestController],
  providers: [QuestService, PrismaService],
  exports: [QuestService],
})
export class QuestModule {}

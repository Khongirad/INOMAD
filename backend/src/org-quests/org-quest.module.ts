import { Module } from '@nestjs/common';
import { OrgQuestController } from './org-quest.controller';
import { OrgQuestService } from './org-quest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RegionalReputationModule } from '../regional-reputation/regional-reputation.module';

@Module({
  imports: [PrismaModule, AuthModule, RegionalReputationModule],
  controllers: [OrgQuestController],
  providers: [OrgQuestService],
  exports: [OrgQuestService],
})
export class OrgQuestModule {}

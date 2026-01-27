import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { CouncilController } from './council.controller';
import { CouncilService } from './council.service';

@Module({
  imports: [PrismaModule],
  controllers: [GuildsController, CouncilController],
  providers: [GuildsService, CouncilService],
  exports: [GuildsService, CouncilService],
})
export class GuildsModule {}

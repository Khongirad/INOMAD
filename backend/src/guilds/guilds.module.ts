import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { CouncilController } from './council.controller';
import { CouncilService } from './council.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GuildsController, CouncilController],
  providers: [GuildsService, CouncilService],
  exports: [GuildsService, CouncilService],
})
export class GuildsModule {}

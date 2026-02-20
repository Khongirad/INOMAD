import { Module } from '@nestjs/common';
import { CreatorModeService } from './creator-mode.service';
import { CreatorModeController } from './creator-mode.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreatorModeController],
  providers: [CreatorModeService],
  exports: [CreatorModeService],
})
export class CreatorModeModule {}

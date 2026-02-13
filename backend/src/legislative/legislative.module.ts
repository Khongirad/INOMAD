import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { VotingCenterService } from './voting-center.service';
import { VotingCenterController } from './voting-center.controller';
import { LegislativeService } from './legislative.service';
import { LegislativeController } from './legislative.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * @module LegislativeModule
 * @description Module for Legislative Branch (Khural) functionality.
 * Combines on-chain voting (VotingCenter) with DB-based proposal lifecycle (Legislative).
 */
@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [VotingCenterController, LegislativeController],
  providers: [VotingCenterService, LegislativeService],
  exports: [VotingCenterService, LegislativeService],
})
export class LegislativeModule {}


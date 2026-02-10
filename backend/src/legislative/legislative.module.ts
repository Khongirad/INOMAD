import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VotingCenterService } from './voting-center.service';
import { VotingCenterController } from './voting-center.controller';

/**
 * @module LegislativeModule
 * @description Module for Legislative Branch (Khural) functionality
 */
@Module({
  imports: [ConfigModule],
  controllers: [VotingCenterController],
  providers: [VotingCenterService],
  exports: [VotingCenterService],
})
export class LegislativeModule {}

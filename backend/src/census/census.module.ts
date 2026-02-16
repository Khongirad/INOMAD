import { Module } from '@nestjs/common';
import { CensusService } from './census.service';
import { CensusController } from './census.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CensusService, PrismaService],
  controllers: [CensusController],
  exports: [CensusService],
})
export class CensusModule {}

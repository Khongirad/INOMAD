import { Module } from '@nestjs/common';
import { ElectionService } from './election.service';
import { ElectionController } from './election.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ElectionController],
  providers: [ElectionService, PrismaService],
  exports: [ElectionService],
})
export class ElectionModule {}

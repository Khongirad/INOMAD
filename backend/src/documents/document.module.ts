import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [TimelineModule],
  controllers: [DocumentController],
  providers: [DocumentService, PrismaService],
  exports: [DocumentService],
})
export class DocumentModule {}

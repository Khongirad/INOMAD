import { Module } from '@nestjs/common';
import { ParliamentService } from './parliament.service';
import { ParliamentController } from './parliament.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParliamentController],
  providers: [ParliamentService],
  exports: [ParliamentService],
})
export class ParliamentModule {}

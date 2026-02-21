import { Module } from '@nestjs/common';
import { JudicialService } from './judicial.service';
import { JudicialController } from './judicial.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JudicialController],
  providers: [JudicialService],
  exports: [JudicialService],
})
export class JudicialModule {}

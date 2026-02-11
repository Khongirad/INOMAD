import { Module } from '@nestjs/common';
import { ChancelleryService } from './chancellery.service';
import { ChancelleryController } from './chancellery.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChancelleryController],
  providers: [ChancelleryService],
  exports: [ChancelleryService],
})
export class ChancelleryModule {}

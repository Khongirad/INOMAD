import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KhuralController } from './khural.controller';
import { KhuralService } from './khural.service';

@Module({
  imports: [PrismaModule],
  controllers: [KhuralController],
  providers: [KhuralService],
  exports: [KhuralService],
})
export class KhuralModule {}

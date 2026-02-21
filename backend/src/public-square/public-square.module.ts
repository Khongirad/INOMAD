import { Module } from '@nestjs/common';
import { PublicSquareService } from './public-square.service';
import { PublicSquareController } from './public-square.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicSquareController],
  providers: [PublicSquareService],
  exports: [PublicSquareService],
})
export class PublicSquareModule {}

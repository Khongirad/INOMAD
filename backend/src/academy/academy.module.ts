import { Module } from '@nestjs/common';
import { AcademyOfSciencesService } from './academy.service';
import { AcademyController } from './academy.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [AcademyController],
  providers: [AcademyOfSciencesService],
  exports: [AcademyOfSciencesService],
})
export class AcademyModule {}

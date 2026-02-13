import { Module } from '@nestjs/common';
import { ParliamentService } from './parliament.service';
import { ParliamentController } from './parliament.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ParliamentController],
  providers: [ParliamentService],
  exports: [ParliamentService],
})
export class ParliamentModule {}

import { Module } from '@nestjs/common';
import { InaugurationService } from './inauguration.service';
import { InaugurationController } from './inauguration.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InaugurationController],
  providers: [InaugurationService],
  exports: [InaugurationService],
})
export class InaugurationModule {}

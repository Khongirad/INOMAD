import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KhuralController } from './khural.controller';
import { KhuralService } from './khural.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [KhuralController],
  providers: [KhuralService],
  exports: [KhuralService],
})
export class KhuralModule {}

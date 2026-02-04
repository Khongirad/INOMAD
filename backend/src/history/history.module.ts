import { Module } from '@nestjs/common';
// import { HistoryService } from './history.service';
// import { HistoryController } from './history.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class HistoryModule {}

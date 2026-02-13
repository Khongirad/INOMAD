import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NewsMediaService } from './news.service';
import { NewsController } from './news.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NewsController],
  providers: [NewsMediaService],
  exports: [NewsMediaService],
})
export class NewsModule {}

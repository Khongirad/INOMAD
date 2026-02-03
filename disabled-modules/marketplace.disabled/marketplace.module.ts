import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JobMarketplaceService } from './job-marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { JobMarketplaceController } from './job-marketplace.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MarketplaceController, JobMarketplaceController],
  providers: [MarketplaceService, JobMarketplaceService],
  exports: [MarketplaceService, JobMarketplaceService],
})
export class MarketplaceModule {}

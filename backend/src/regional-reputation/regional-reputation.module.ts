import { Module } from '@nestjs/common';
import { RegionalReputationController } from './regional-reputation.controller';
import { RegionalReputationService } from './regional-reputation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RegionalReputationController],
  providers: [RegionalReputationService],
  exports: [RegionalReputationService],
})
export class RegionalReputationModule {}

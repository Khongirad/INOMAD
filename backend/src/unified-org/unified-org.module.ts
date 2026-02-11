import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UnifiedOrgService } from './unified-org.service';
import { UnifiedOrgController } from './unified-org.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UnifiedOrgController],
  providers: [UnifiedOrgService],
  exports: [UnifiedOrgService],
})
export class UnifiedOrgModule {}

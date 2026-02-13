import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UnifiedOrgService } from './unified-org.service';
import { UnifiedOrgController } from './unified-org.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UnifiedOrgController],
  providers: [UnifiedOrgService],
  exports: [UnifiedOrgService],
})
export class UnifiedOrgModule {}

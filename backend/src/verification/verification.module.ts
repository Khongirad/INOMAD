import { Module, forwardRef } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { CreatorBootstrapService } from './creator-bootstrap.service';
import { TieredVerificationService } from './tiered-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TimelineModule } from '../timeline/timeline.module';
import { DistributionModule } from '../distribution/distribution.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TimelineModule,
    forwardRef(() => DistributionModule), // Avoid circular dependency
  ],
  controllers: [VerificationController],
  providers: [VerificationService, CreatorBootstrapService, TieredVerificationService],
  exports: [VerificationService, CreatorBootstrapService, TieredVerificationService],
})
export class VerificationModule {}

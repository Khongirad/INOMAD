import { Module } from '@nestjs/common';
// import { VerificationService } from './verification.service';
// import { VerificationController } from './verification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, AuthModule, TimelineModule],
  controllers: [],
  // providers: [VerificationService],  // Disabled - service file renamed
  // exports: [VerificationService],  // Disabled - service file renamed
})
export class VerificationModule {}

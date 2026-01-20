import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityController } from './identity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RegistrationService, VerificationService],
  controllers: [IdentityController],
  exports: [RegistrationService, VerificationService],
})
export class IdentityModule {}

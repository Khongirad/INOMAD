import { Module } from '@nestjs/common';
import { ProfessionsController } from './professions.controller';
import { ProfessionsService } from './professions.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfessionsController],
  providers: [ProfessionsService],
  exports: [ProfessionsService],
})
export class ProfessionsModule {}

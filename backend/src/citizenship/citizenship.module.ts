import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CitizenshipService } from './citizenship.service';
import { CitizenshipController } from './citizenship.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CitizenshipController],
  providers: [CitizenshipService],
  exports: [CitizenshipService], // Exported for use in Legislative, Khural, etc.
})
export class CitizenshipModule {}

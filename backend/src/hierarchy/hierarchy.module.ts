import { Module } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { HierarchyController } from './hierarchy.controller';
import { KhuralValidationService } from './khural-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HierarchyController],
  providers: [HierarchyService, KhuralValidationService],
  exports: [HierarchyService, KhuralValidationService],
})
export class HierarchyModule {}

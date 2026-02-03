import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController, CreatorController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CreatorGuard } from '../auth/guards/creator.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule, // Provides JwtAuthGuard
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret', // Consider using a config service for this
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [AdminController, CreatorController],
  providers: [AdminService, CreatorGuard, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}

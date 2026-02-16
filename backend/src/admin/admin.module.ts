import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('AUTH_JWT_SECRET');
        if (!secret) {
          throw new Error('AUTH_JWT_SECRET environment variable is required for AdminModule');
        }
        return {
          secret,
          signOptions: { expiresIn: '60m' },
        };
      },
    }),
  ],
  controllers: [AdminController, CreatorController],
  providers: [AdminService, CreatorGuard, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}


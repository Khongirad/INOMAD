import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthMiddleware } from './auth.middleware';
import { PrismaModule } from '../prisma/prisma.module';

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('AUTH_JWT_SECRET') || 'dev-auth-secret-change-me',
        signOptions: {
          expiresIn: parseExpiryToSeconds(configService.get<string>('AUTH_JWT_EXPIRY') || '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthPasswordService, AuthGuard, JwtAuthGuard],
  exports: [AuthService, AuthPasswordService, AuthGuard, JwtModule],
})
export class AuthModule {
  /**
   * Legacy middleware: still applied for backward compatibility with
   * existing endpoints that use x-seat-id header auth.
   * New endpoints should use AuthGuard instead.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'identity/register', method: RequestMethod.POST },
        // Exclude new auth endpoints (they handle their own auth)
        { path: 'auth/nonce', method: RequestMethod.POST },
        { path: 'auth/verify', method: RequestMethod.POST },
        { path: 'auth/me', method: RequestMethod.GET },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/logout-all', method: RequestMethod.POST },
        // Gates of Khural endpoints  
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login-password', method: RequestMethod.POST },
        { path: 'auth/accept-tos', method: RequestMethod.POST },
        { path: 'auth/accept-constitution', method: RequestMethod.POST },
        { path: 'auth/change-password', method: RequestMethod.POST },
        // Exclude bank endpoints (bank module handles its own auth)
        { path: 'bank/(.*)', method: RequestMethod.ALL },
        // Exclude E2E test endpoints (public for testing)
        { path: 'e2e/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}

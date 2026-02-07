import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    seatId: string;
    role: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // ВАЖНО: req.path = '/' из-за Express router mounting
    // Используем req.originalUrl который содержит ПОЛНЫЙ путь
    const originalUrl = req.originalUrl;
    
    // DEBUG: Log для понимания структуры запросов
    if (originalUrl.includes('transparency') || originalUrl.includes('activities')) {
      console.log('[AuthMiddleware] Transparency/Activities request:', {
        path: req.path,           // '/' - бесполезен!  
        originalUrl: req.originalUrl,  // '/api/transparency/dashboard' - источник истины!
        method: req.method,
      });
    }
    
    // Skip auth for PUBLIC endpoints
    // ИСТОЧНИК ИСТИНЫ: req.originalUrl (не req.path!)
    if (
      // Transparency endpoints (public read-only)
      originalUrl.startsWith('/api/transparency') ||
      originalUrl.startsWith('/api/activities') ||
      // Auth endpoints (public registration, login, nonce, verify)
      originalUrl.startsWith('/api/auth/register') ||
      originalUrl.startsWith('/api/auth/login') ||
      originalUrl.startsWith('/api/auth/nonce') ||
      originalUrl.startsWith('/api/auth/verify') ||
      originalUrl.startsWith('/api/auth/refresh') ||
      // Health check
      originalUrl.startsWith('/api/health')
    ) {
      console.log('[AuthMiddleware] ✅ PUBLIC ENDPOINT - Skipping auth for:', originalUrl);
      return next();
    }

    const seatId = req.headers['x-seat-id'] as string;

    if (!seatId) {
      throw new UnauthorizedException('Missing x-seat-id header');
    }

    // Find user by seatId
    const user = await this.prisma.user.findUnique({
      where: { seatId },
      select: {
        id: true,
        seatId: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid seat ID');
    }

    // Attach user to request
    req.user = user;
    next();
  }
}

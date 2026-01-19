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

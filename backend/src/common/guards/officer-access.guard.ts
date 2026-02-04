import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, VerificationLevel } from '@prisma/client';

/**
 * Guard to check if user has officer/admin access to government services
 * 
 * Creator has access to EVERYTHING as supreme administrator
 * Admin has access to services specified in metadata
 * Regular users need specific officer assignments
 */
@Injectable()
export class OfficerAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Not authenticated');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        verificationLevel: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Creator has access to EVERYTHING
    if (user.role === UserRole.CREATOR) {
      return true;
    }

    // Admin has access to most things (can be restricted by metadata if needed)
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // For regular users, check if they are specifically assigned as officer
    // This would require additional officer assignment system (Phase 2)
    // For now, deny access for non-admin users
    throw new ForbiddenException(
      'Only Creator, Admin, or assigned officers can access this resource'
    );
  }
}

/**
 * Decorator to mark endpoints that require officer access
 */
export const RequireOfficerAccess = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // Marker decorator - actual logic in guard
  };
};

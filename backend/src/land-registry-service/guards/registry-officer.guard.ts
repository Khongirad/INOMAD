import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * RegistryOfficerGuard
 * 
 * Allows access to REGISTRY_OFFICER and ADMIN roles
 * Used for land registry and cadastral management endpoints
 */
@Injectable()
export class RegistryOfficerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Allow REGISTRY_OFFICER or ADMIN roles
    const allowedRoles = ['REGISTRY_OFFICER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Land registry officer privileges required');
    }

    return true;
  }
}

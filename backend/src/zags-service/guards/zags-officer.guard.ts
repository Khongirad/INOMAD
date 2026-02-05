import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * ZagsOfficerGuard
 * 
 * Allows access to ZAGS_OFFICER and ADMIN roles
 * Used for civil registry (marriage, divorce) processing endpoints
 */
@Injectable()
export class ZagsOfficerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Allow ZAGS_OFFICER or ADMIN roles
    const allowedRoles = ['ZAGS_OFFICER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('ZAGS officer privileges required');
    }

    return true;
  }
}

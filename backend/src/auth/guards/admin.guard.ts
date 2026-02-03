import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * AdminGuard - Allows access to ADMIN and CREATOR roles
 * 
 * Used for user management endpoints where both admins and creator can operate:
 * - User verification
 * - User listing
 * - User status updates
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Allow ADMIN or CREATOR roles
    const allowedRoles = ['ADMIN', 'CREATOR'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Admin privileges required');
    }

    // Check if account is frozen (admins can be frozen by Creator)
    if (user.isFrozen && user.role === 'ADMIN') {
      throw new ForbiddenException('Account is frozen. Contact Creator.');
    }

    return true;
  }
}

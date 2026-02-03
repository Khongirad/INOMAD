import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * CreatorGuard - Allows access ONLY to CREATOR role
 * 
 * Supreme admin guard for Creator-only endpoints like:
 * - Admin management (freeze, password reset, seat reassignment)
 * - Creating/removing admin accounts
 */
@Injectable()
export class CreatorGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Only CREATOR role allowed
    if (user.role !== 'CREATOR') {
      throw new ForbiddenException('Creator privileges required');
    }

    // Additional check: Creator account cannot be frozen
    if (user.isFrozen) {
      throw new ForbiddenException('Account is frozen');
    }

    return true;
  }
}

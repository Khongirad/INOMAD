import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * MigrationOfficerGuard
 * 
 * Allows access to MIGRATION_OFFICER and ADMIN roles
 * Used for passport application processing endpoints
 */
@Injectable()
export class MigrationOfficerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Allow MIGRATION_OFFICER or ADMIN roles
    const allowedRoles = ['MIGRATION_OFFICER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Migration officer privileges required');
    }

    return true;
  }
}

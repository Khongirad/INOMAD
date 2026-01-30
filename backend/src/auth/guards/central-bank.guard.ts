import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CentralBankGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has Central Bank role
    // TODO: Implement proper role checking from database
    const isCentralBanker = user?.role === 'CENTRAL_BANK_GOVERNOR' || user?.role === 'CENTRAL_BANK_BOARD';

    if (!isCentralBanker) {
      throw new ForbiddenException('Only Central Bank Governing Council can perform this action');
    }

    return true;
  }
}

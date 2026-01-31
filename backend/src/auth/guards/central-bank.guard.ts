import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CentralBankGuard implements CanActivate {
  private readonly logger = new Logger(CentralBankGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.address) {
      this.logger.warn('CentralBankGuard: No user address in request');
      throw new ForbiddenException('Authentication required');
    }

    // Check if user is an active Central Bank Officer
    const officer = await this.prisma.centralBankOfficer.findFirst({
      where: {
        walletAddress: user.address.toLowerCase(),
        isActive: true,
        revokedAt: null,
      },
    });

    if (!officer) {
      this.logger.warn(`CentralBankGuard: User ${user.address} is not a Central Bank Officer`);
      throw new ForbiddenException('Only Central Bank Governing Council can perform this action');
    }

    // Add officer info to request for downstream use
    request.cbOfficer = {
      id: officer.id,
      role: officer.role,
      name: officer.name,
    };

    this.logger.log(`CentralBankGuard: Access granted to ${officer.role} ${officer.name || user.address}`);
    return true;
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-zags';

@Injectable()
export class ConsentService {
  constructor(
    @Inject('ZAGS_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Get pending consent requests for a user
   */
  async getPendingConsents(userId: string) {
    return this.prisma.marriageConsent.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: {
        marriage: true,
      },
    });
  }

  /**
   * Get consent by marriage and user
   */
  async getConsent(marriageId: string, userId: string) {
    return this.prisma.marriageConsent.findUnique({
      where: {
        marriageId_userId: {
          marriageId,
          userId,
        },
      },
    });
  }
}

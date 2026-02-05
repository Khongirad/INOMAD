import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-zags';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EligibilityService {
  constructor(
    @Inject('ZAGS_PRISMA') private zagsPrisma: PrismaClient,
    private mainPrisma: PrismaService, // Main DB for user DOB lookup
  ) {}

  /**
   * Check if user is eligible to marry
   */
  async checkEligibility(userId: string): Promise<{
    isEligible: boolean;
    reason?: string;
  }> {
    // Check if already married
    const existingMarriage = await this.zagsPrisma.marriage.findFirst({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
        status: 'REGISTERED',
      },
    });

    if (existingMarriage) {
      return {
        isEligible: false,
        reason: 'Already married. Must divorce before remarrying.',
      };
    }

    // Check if pending marriage application
    const pendingMarriage = await this.zagsPrisma.marriage.findFirst({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
        status: {
          in: ['PENDING_CONSENT', 'PENDING_REVIEW', 'APPROVED'],
        },
      },
    });

    if (pendingMarriage) {
      return {
        isEligible: false,
        reason: 'Already have a pending marriage application.',
      };
    }

    // Check age requirement (integrated with main DB)
    const user = await this.mainPrisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true },
    });
    
    if (user?.dateOfBirth) {
      const age = this.calculateAge(user.dateOfBirth);
      if (age < 18) {
        return {
          isEligible: false,
          reason: 'Must be at least 18 years old to marry.',
        };
      }
    }

    return { isEligible: true };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if both parties are eligible
   */
  async checkBothEligible(spouse1Id: string, spouse2Id: string): Promise<{
    isEligible: boolean;
    reason?: string;
  }> {
    const eligibility1 = await this.checkEligibility(spouse1Id);
    if (!eligibility1.isEligible) {
      return {
        isEligible: false,
        reason: `Spouse 1: ${eligibility1.reason}`,
      };
    }

    const eligibility2 = await this.checkEligibility(spouse2Id);
    if (!eligibility2.isEligible) {
      return {
        isEligible: false,
        reason: `Spouse 2: ${eligibility2.reason}`,
      };
    }

    // Check that they're not the same person
    if (spouse1Id === spouse2Id) {
      return {
        isEligible: false,
        reason: 'Cannot marry yourself.',
      };
    }

    return { isEligible: true };
  }
}

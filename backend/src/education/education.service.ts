import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducationType, EducationVerification } from '@prisma/client';

interface SubmitEducationDto {
  userId: string;
  type: EducationType;
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentHash?: string;
  documentUrl?: string;
  recommenderId?: string; // Required if type = RECOMMENDATION
}

interface VerifyEducationDto {
  verificationId: string;
  adminId: string;
  validForGuilds?: string[]; // Guild categories this allows
}

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Submit education verification (diploma, certificate, or recommendation)
   */
  async submitEducation(data: SubmitEducationDto): Promise<EducationVerification> {
    const { userId, type, recommenderId } = data;

    // If RECOMMENDATION type, validate recommender
    if (type === 'RECOMMENDATION') {
      if (!recommenderId) {
        throw new BadRequestException('Recommender required for RECOMMENDATION type');
      }

      // Check recommender has verified education in same field
      const recommenderEducation = await this.prisma.educationVerification.findFirst({
        where: {
          userId: recommenderId,
          fieldOfStudy: data.fieldOfStudy,
          isVerified: true,
        },
      });

      if (!recommenderEducation) {
        throw new ForbiddenException(
          'Recommender must have verified education in the same field'
        );
      }
    }

    // Check for existing pending verification in same field
    const existing = await this.prisma.educationVerification.findFirst({
      where: {
        userId,
        fieldOfStudy: data.fieldOfStudy,
        isVerified: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending verification for this field'
      );
    }

    // Create verification
    return this.prisma.educationVerification.create({
      data: {
        userId,
        type,
        institution: data.institution,
        fieldOfStudy: data.fieldOfStudy,
        graduationYear: data.graduationYear,
        documentHash: data.documentHash,
        documentUrl: data.documentUrl,
        recommenderId,
        isVerified: false,
      },
      include: {
        user: true,
        recommender: true,
      },
    });
  }

  /**
   * Admin verifies education (after reviewing documents)
   */
  async verifyEducation(data: VerifyEducationDto): Promise<EducationVerification> {
    const { verificationId, adminId, validForGuilds } = data;

    // Get verification
    const verification = await this.prisma.educationVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Education verification not found');
    }

    if (verification.isVerified) {
      throw new BadRequestException('Already verified');
    }

    // Check admin permissions (you can add admin check here)
    // For now, assuming adminId is valid admin

    // Update verification
    return this.prisma.educationVerification.update({
      where: { id: verificationId },
      data: {
        isVerified: true,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        validForGuilds: validForGuilds || [],
      },
      include: {
        user: true,
        recommender: true,
      },
    });
  }

  /**
   * Reject education verification
   */
  async rejectEducation(verificationId: string, adminId: string): Promise<void> {
    const verification = await this.prisma.educationVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Education verification not found');
    }

    // Delete the verification (user can resubmit)
    await this.prisma.educationVerification.delete({
      where: { id: verificationId },
    });
  }

  /**
   * Check if user has verified education for a field/guild
   */
  async hasVerifiedEducation(
    userId: string,
    fieldOfStudy?: string,
    guildId?: string
  ): Promise<boolean> {
    const where: any = {
      userId,
      isVerified: true,
    };

    if (fieldOfStudy) {
      where.fieldOfStudy = fieldOfStudy;
    }

    if (guildId) {
      where.validForGuilds = {
        has: guildId,
      };
    }

    const verification = await this.prisma.educationVerification.findFirst({
      where,
    });

    return !!verification;
  }

  /**
   * Get user's education verifications
   */
  async getUserEducation(userId: string) {
    return this.prisma.educationVerification.findMany({
      where: { userId },
      include: {
        recommender: {
          select: {
            id: true,
            username: true,
            
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get pending education verifications (for admin review)
   */
  async getPendingVerifications() {
    return this.prisma.educationVerification.findMany({
      where: {
        isVerified: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            
            email: true,
          },
        },
        recommender: {
          select: {
            id: true,
            username: true,
            
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get recommendations given by a user
   */
  async getRecommendationsGiven(userId: string) {
    return this.prisma.educationVerification.findMany({
      where: {
        recommenderId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get verified specialists in a field (for recommender selection)
   */
  async getVerifiedSpecialists(fieldOfStudy: string, limit: number = 20) {
    const verifications = await this.prisma.educationVerification.findMany({
      where: {
        fieldOfStudy,
        isVerified: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            
          },
        },
      },
      take: limit,
      orderBy: {
        verifiedAt: 'desc',
      },
    });

    return verifications.map((v) => v.user);
  }
}

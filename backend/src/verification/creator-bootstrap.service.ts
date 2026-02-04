import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationLevel, UserRole } from '@prisma/client';

@Injectable()
export class CreatorBootstrapService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureCreatorFullyVerified();
  }

  /**
   * Ensure all Creator accounts are automatically FULLY_VERIFIED
   * Creator is the supreme administrator and needs full access to all systems
   */
  async ensureCreatorFullyVerified() {
    // Find all users with CREATOR role
    const creators = await this.prisma.user.findMany({
      where: {
        role: UserRole.CREATOR,
      },
    });

    // Update each creator to FULLY_VERIFIED if not already
    for (const creator of creators) {
      if (creator.verificationLevel !== VerificationLevel.FULLY_VERIFIED) {
        await this.prisma.user.update({
          where: { id: creator.id },
          data: {
            verificationLevel: VerificationLevel.FULLY_VERIFIED,
            verificationLevelSetAt: new Date(),
            verificationLevelSetBy: creator.id, // Self-verified by Creator role
            fullyVerifiedAt: new Date(),
            isVerified: true, // Legacy field
            verifiedAt: new Date(),
          },
        });

        console.log(`✅ Creator ${creator.username || creator.seatId} auto-verified to FULLY_VERIFIED`);
      }
    }
  }

  /**
   * Check if user is Creator (supreme admin)
   */
  isCreator(userId: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({
        where: { id: userId },
        select: { role: true },
      })
      .then((user) => user?.role === UserRole.CREATOR);
  }

  /**
   * Check if user has admin privileges (CREATOR or ADMIN)
   */
  async hasAdminPrivileges(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    
    return user?.role === UserRole.CREATOR || user?.role === UserRole.ADMIN;
  }
}

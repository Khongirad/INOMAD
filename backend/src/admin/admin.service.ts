import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const [totalUsers, pendingUsers, verifiedUsers, rejectedUsers, totalAdmins] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.user.count({ where: { verificationStatus: 'REJECTED' } }),
      this.prisma.user.count({ where: { role: { in: ['ADMIN', 'CREATOR'] } } }),
    ]);

    return {
      totalUsers,
      pendingUsers,
      verifiedUsers,
      rejectedUsers,
      totalAdmins,
    };
  }

  /**
   * List all users with optional filtering
   */
  async listUsers(filters?: { 
    status?: string; 
    role?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (filters?.status) {
      where.verificationStatus = filters.status;
    }
    
    if (filters?.role) {
      where.role = filters.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        select: {
          id: true,
          seatId: true,
          role: true,
          verificationStatus: true,
          isFrozen: true,
          walletStatus: true,
          createdAt: true,
          updatedAt: true,
          ethnicity: true,
          clan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Get pending verification users
   */
  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        verificationStatus: { in: ['DRAFT', 'PENDING'] },
      },
      select: {
        id: true,
        seatId: true,
        verificationStatus: true,
        createdAt: true,
        ethnicity: true,
        clan: true,
        birthPlace: true,
        currentAddress: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Verify a user (ADMIN + CREATOR)
   */
  async verifyUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('User is already verified');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: 'VERIFIED',
        isSuperVerified: true,
        superVerifiedBy: adminId,
        walletStatus: 'UNLOCKED', // Unlock wallet upon verification
      },
    });
  }

  /**
   * Reject a user (ADMIN + CREATOR)
   */
  async rejectUser(userId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: 'REJECTED',
      },
    });
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        mpcWallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ==================== CREATOR-ONLY FUNCTIONS ====================

  /**
   * List all admin accounts (CREATOR ONLY)
   */
  async listAdmins() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'CREATOR'] },
      },
      select: {
        id: true,
        seatId: true,
        role: true,
        isFrozen: true,
        frozenAt: true,
        frozenBy: true,
        walletAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create new admin (CREATOR ONLY, max 9 admins)
   */
  async createAdmin(seatId: string, creatorId: string) {
    // Check if max 9 admins already exist
    const adminCount = await this.prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount >= 9) {
      throw new BadRequestException('Maximum of 9 admin accounts reached');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { seatId },
    });

    if (!user) {
      throw new NotFoundException('User with this seatId not found');
    }

    if (user.role === 'ADMIN' || user.role === 'CREATOR') {
      throw new BadRequestException('User is already an admin');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
      },
    });
  }

  /**
   * Freeze/Unfreeze admin account (CREATOR ONLY)
   */
  async toggleFreezeAdmin(userId: string, creatorId: string, freeze: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'CREATOR') {
      throw new ForbiddenException('Cannot freeze Creator account');
    }

    if (user.role !== 'ADMIN') {
      throw new BadRequestException('Can only freeze ADMIN accounts');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isFrozen: freeze,
        frozenAt: freeze ? new Date() : null,
        frozenBy: freeze ? creatorId : null,
      },
    });
  }

  /**
   * Remove admin privileges (CREATOR ONLY)
   */
  async removeAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'CREATOR') {
      throw new ForbiddenException('Cannot remove Creator role');
    }

    if (user.role !== 'ADMIN') {
      throw new BadRequestException('User is not an admin');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: 'CITIZEN',
        isFrozen: false,
        frozenAt: null,
        frozenBy: null,
      },
    });
  }
}

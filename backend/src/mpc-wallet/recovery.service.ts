import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { 
  RecoveryMethod, 
  GuardianType, 
  RecoverySessionStatus,
  MPCWalletStatus
} from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Recovery Service
 * 
 * Manages social recovery and guardian system for MPC wallets.
 * Integrates with Arban structure for automatic guardian suggestions.
 */
@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  
  // Recovery session timeout
  private readonly SESSION_TIMEOUT_HOURS = 24;
  
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Add a recovery guardian
   */
  async addGuardian(
    walletId: string,
    guardianType: GuardianType,
    guardianRef: string,
    guardianName?: string,
    guardianUserId?: string
  ) {
    // Check max guardians
    const count = await this.prisma.recoveryGuardian.count({
      where: { walletId }
    });
    
    if (count >= 5) {
      throw new BadRequestException('Maximum 5 guardians allowed');
    }
    
    return this.prisma.recoveryGuardian.create({
      data: {
        walletId,
        guardianType,
        guardianRef,
        guardianName,
        guardianUserId,
      }
    });
  }

  /**
   * Get guardians for wallet
   */
  async getGuardians(walletId: string) {
    return this.prisma.recoveryGuardian.findMany({
      where: { walletId },
      orderBy: { isConfirmed: 'desc' }
    });
  }

  /**
   * Suggest guardians based on Arban membership
   */
  async suggestGuardians(userId: string): Promise<Array<{
    type: GuardianType;
    userId?: string;
    ref: string;
    name?: string;
    relationship: string;
    trust: 'HIGH' | 'MEDIUM' | 'LOW';
  }>> {
    const suggestions: Array<{
      type: GuardianType;
      userId?: string;
      ref: string;
      name?: string;
      relationship: string;
      trust: 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];
    
    // Find user by ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return suggestions;
    
    // Find Family Arban where user is a member
    const familyArbans = await this.prisma.familyArban.findMany({
      where: {
        OR: [
          { husbandSeatId: user.seatId },
          { wifeSeatId: user.seatId },
        ]
      },
      include: {
        children: true,
      }
    });
    
    for (const arban of familyArbans) {
      // Spouse - highest trust
      const spouseSeatId = arban.husbandSeatId === user.seatId 
        ? arban.wifeSeatId 
        : arban.husbandSeatId;
        
      if (spouseSeatId) {
        suggestions.push({
          type: GuardianType.SPOUSE,
          userId: spouseSeatId,
          ref: spouseSeatId,
          relationship: 'Spouse',
          trust: 'HIGH',
        });
      }
      
      // Khural Representative - high trust (using khuralRepSeatId field)
      if (arban.khuralRepSeatId) {
        suggestions.push({
          type: GuardianType.KHURAL_REP,
          userId: arban.khuralRepSeatId,
          ref: arban.khuralRepSeatId,
          name: 'Khural Representative',
          relationship: 'Khural Representative',
          trust: 'HIGH',
        });
      }
      
      // Adult children - medium trust (using childSeatId field)
      for (const child of arban.children) {
        if (child.childSeatId) {
          suggestions.push({
            type: GuardianType.FAMILY,
            userId: child.childSeatId,
            ref: child.childSeatId,
            relationship: 'Child',
            trust: 'MEDIUM',
          });
        }
      }
    }
    
    // Find Organizational Arban memberships (using orgArbanMember model)
    const orgMemberships = await this.prisma.orgArbanMember.findMany({
      where: { seatId: user.seatId },
      include: {
        org: true,
      }
    });
    
    for (const membership of orgMemberships) {
      const org = membership.org;
      
      // Leader - medium trust (using leaderSeatId field)
      if (org.leaderSeatId && org.leaderSeatId !== user.seatId) {
        suggestions.push({
          type: GuardianType.FRIEND,
          userId: org.leaderSeatId,
          ref: org.leaderSeatId,
          name: 'Org Leader',
          relationship: 'Organization Leader',
          trust: 'MEDIUM',
        });
      }
    }
    
    return suggestions;
  }


  /**
   * Initiate recovery session
   */
  async initiateRecovery(address: string, method: RecoveryMethod) {
    // Find wallet by address
    const wallet = await this.prisma.mPCWallet.findUnique({
      where: { address: address.toLowerCase() },
      include: { guardians: true }
    });
    
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    // Check if already in recovery
    const activeSession = await this.prisma.recoverySession.findFirst({
      where: {
        walletId: wallet.id,
        status: {
          in: [RecoverySessionStatus.PENDING, RecoverySessionStatus.APPROVING]
        }
      }
    });
    
    if (activeSession) {
      throw new BadRequestException('Recovery already in progress');
    }
    
    // Determine required approvals
    let requiredApprovals = 2;
    if (method === RecoveryMethod.SOCIAL) {
      const confirmedGuardians = wallet.guardians.filter(g => g.isConfirmed);
      if (confirmedGuardians.length < 2) {
        throw new BadRequestException('Not enough confirmed guardians for social recovery');
      }
      requiredApprovals = Math.ceil(confirmedGuardians.length / 2);
    }
    
    // Generate verification code for email/phone
    const verificationCode = method !== RecoveryMethod.SOCIAL 
      ? crypto.randomInt(100000, 999999).toString()
      : null;
    
    // Create session
    const session = await this.prisma.recoverySession.create({
      data: {
        walletId: wallet.id,
        status: RecoverySessionStatus.PENDING,
        method,
        verificationCode,
        requiredApprovals,
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000),
      }
    });
    
    // Update wallet status
    await this.prisma.mPCWallet.update({
      where: { id: wallet.id },
      data: { status: MPCWalletStatus.RECOVERY_MODE }
    });
    
    // Send verification code or notify guardians
    if (method === RecoveryMethod.EMAIL && verificationCode) {
      // Get user email from wallet
      const user = await this.prisma.user.findUnique({
        where: { id: wallet.userId },
        select: { email: true }
      });
      
      if (user?.email) {
        await this.notificationService.sendVerificationEmail(
          user.email,
          verificationCode,
          wallet.address
        );
      }
    } else if (method === RecoveryMethod.PHONE && verificationCode) {
      // Get user phone from wallet
      // SMS notification disabled - phone field not in User model
      // TODO: Add phone field to User schema if SMS recovery needed
      /*
      const user = await this.prisma.user.findUnique({
        where: { id: wallet.userId },
        select: { phone: true }
      });
      
      if (user?.phone) {
        await this.notificationService.sendVerificationSMS(
          user.phone,
          verificationCode
        );
      }
      */
    } else if (method === RecoveryMethod.SOCIAL) {
      // Notify all confirmed guardians
      const confirmedGuardians = wallet.guardians.filter(g => g.isConfirmed);
      
      for (const guardian of confirmedGuardians) {
        if (guardian.guardianUserId) {
          const guardianUser = await this.prisma.user.findUnique({
            where: { id: guardian.guardianUserId },
            select: { email: true, username: true }
          });
          
          const requesterUser = await this.prisma.user.findUnique({
            where: { id: wallet.userId },
            select: { username: true }
          });
          
          if (guardianUser?.email) {
            const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/recovery/approve/${session.id}`;
            
            await this.notificationService.notifyGuardian(
              guardianUser.email,
              guardianUser.username || 'Guardian',
              requesterUser?.username || 'User',
              wallet.address,
              approvalLink
            );
          }
        }
      }
    }
    
    this.logger.log(`Recovery initiated for wallet ${wallet.address} via ${method}`);
    
    return session;
  }

  /**
   * Confirm recovery (for email/phone methods)
   */
  async confirmRecovery(
    sessionId: string,
    verificationCode?: string
  ) {
    const session = await this.prisma.recoverySession.findUnique({
      where: { id: sessionId },
    });
    
    if (!session) {
      throw new NotFoundException('Recovery session not found');
    }
    
    if (session.status === RecoverySessionStatus.EXPIRED) {
      throw new BadRequestException('Recovery session expired');
    }
    
    if (new Date() > session.expiresAt) {
      await this.prisma.recoverySession.update({
        where: { id: sessionId },
        data: { status: RecoverySessionStatus.EXPIRED }
      });
      throw new BadRequestException('Recovery session expired');
    }
    
    // Verify code for non-social methods
    if (session.method !== RecoveryMethod.SOCIAL) {
      if (session.verificationCode !== verificationCode) {
        throw new BadRequestException('Invalid verification code');
      }
    }
    
    // For social recovery, check guardian approvals
    if (session.method === RecoveryMethod.SOCIAL) {
      if (session.currentApprovals < session.requiredApprovals) {
        throw new BadRequestException(
          `Need ${session.requiredApprovals - session.currentApprovals} more guardian approvals`
        );
      }
    }
    
    // Mark session as completed
    await this.prisma.recoverySession.update({
      where: { id: sessionId },
      data: {
        status: RecoverySessionStatus.COMPLETED,
        completedAt: new Date()
      }
    });
    
    // Generate new device share
    // In production, this would regenerate key shares
    // For now, return old server share (simplified)
    
    const wallet = await this.prisma.mPCWallet.findUnique({
      where: { id: session.walletId }
    });
    
    // Reset wallet status
    await this.prisma.mPCWallet.update({
      where: { id: session.walletId },
      data: { status: MPCWalletStatus.ACTIVE }
    });
    
    this.logger.log(`Recovery completed for wallet ${wallet?.address}`);
    
    return {
      success: true,
      message: 'Recovery completed. You can now set up a new device.',
      // In production, return new device share here
    };
  }

  /**
   * Guardian approves recovery request
   */
  async approveRecovery(
    sessionId: string,
    guardianUserId: string
  ) {
    const session = await this.prisma.recoverySession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      throw new NotFoundException('Recovery session not found');
    }
    
    // Verify guardian is valid for this wallet
    const guardian = await this.prisma.recoveryGuardian.findFirst({
      where: {
        walletId: session.walletId,
        guardianUserId,
        isConfirmed: true,
      }
    });
    
    if (!guardian) {
      throw new BadRequestException('Not a valid guardian for this wallet');
    }
    
    if (guardian.recoveryApproved) {
      throw new BadRequestException('Already approved this recovery');
    }
    
    // Mark guardian as approved
    await this.prisma.recoveryGuardian.update({
      where: { id: guardian.id },
      data: {
        recoveryApproved: true,
        approvedAt: new Date()
      }
    });
    
    // Increment approval count
    await this.prisma.recoverySession.update({
      where: { id: sessionId },
      data: {
        currentApprovals: { increment: 1 },
        status: RecoverySessionStatus.APPROVING,
      }
    });
    
    this.logger.log(`Guardian ${guardianUserId} approved recovery session ${sessionId}`);
    
    return { approved: true };
  }
}

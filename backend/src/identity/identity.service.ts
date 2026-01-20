import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletStatus } from '@prisma/client';

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: String) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId as string },
      include: {
        unlockRequest: {
          include: {
            approvals: {
              include: {
                approver: {
                  select: { id: true, seatId: true, role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  async requestUnlock(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    
    if (user.walletStatus === WalletStatus.UNLOCKED) {
       throw new BadRequestException('Wallet already unlocked');
    }

    // Upsert request
    const request = await this.prisma.unlockRequest.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        status: WalletStatus.PENDING
      }
    });

    // Update User Status
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletStatus: WalletStatus.PENDING }
    });

    return request;
  }

  async approveUnlock(approverId: string, targetUserId: string) {
    if (approverId === targetUserId) {
      throw new BadRequestException("Cannot approve own unlock request");
    }

    const request = await this.prisma.unlockRequest.findUnique({
      where: { userId: targetUserId }
    });

    if (!request || request.status !== WalletStatus.PENDING) {
      throw new BadRequestException("Target user is not PENDING unlock");
    }

    // Create approval
    try {
      const approval = await this.prisma.unlockApproval.create({
        data: {
          requestId: request.id,
          approverUserId: approverId
        }
      });
      return approval;
    } catch (e) {
      throw new BadRequestException("Already approved or invalid request");
    }
  }

  async finalizeUnlock(userId: string) {
    const request = await this.prisma.unlockRequest.findUnique({
      where: { userId },
      include: { approvals: true }
    });

    if (!request) throw new BadRequestException("No request found");
    
    // Quorum Check (3)
    if (request.approvals.length < 3) {
      throw new ForbiddenException(`Quorum not reached. Current: ${request.approvals.length}/3`);
    }

    // Execute Unlock
    await this.prisma.$transaction([
      this.prisma.user.update({
         where: { id: userId },
         data: { walletStatus: WalletStatus.UNLOCKED }
      }),
      this.prisma.unlockRequest.update({
        where: { id: request.id },
        data: { status: WalletStatus.UNLOCKED }
      })
    ]);

    return { status: "UNLOCKED", timestamp: new Date() };
  }
}

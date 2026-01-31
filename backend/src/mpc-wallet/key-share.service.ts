import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShareType } from '@prisma/client';

/**
 * Key Share Service
 * 
 * Manages key share metadata and device tracking.
 * Does NOT store actual key shares - only metadata.
 */
@Injectable()
export class KeyShareService {
  private readonly logger = new Logger(KeyShareService.name);
  
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new device for key storage
   */
  async registerDevice(
    walletId: string,
    deviceId: string,
    deviceName: string,
    userAgent: string
  ) {
    // Check if device already registered
    const existing = await this.prisma.keyShare.findFirst({
      where: {
        walletId,
        shareType: ShareType.DEVICE,
        deviceId,
        isActive: true,
      }
    });
    
    if (existing) {
      // Update last used
      return this.prisma.keyShare.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() }
      });
    }
    
    // Count existing device shares
    const deviceCount = await this.prisma.keyShare.count({
      where: {
        walletId,
        shareType: ShareType.DEVICE,
        isActive: true,
      }
    });
    
    // Create new device share record
    const wallet = await this.prisma.mPCWallet.findUnique({
      where: { id: walletId }
    });
    
    return this.prisma.keyShare.create({
      data: {
        walletId,
        shareType: ShareType.DEVICE,
        shareIndex: deviceCount, // Each device gets unique index
        publicKey: wallet!.address,
        deviceId,
        deviceName,
        userAgent,
        lastUsedAt: new Date(),
      }
    });
  }

  /**
   * Revoke a device share
   */
  async revokeDevice(
    walletId: string,
    deviceId: string,
    reason: string
  ) {
    return this.prisma.keyShare.updateMany({
      where: {
        walletId,
        deviceId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason,
      }
    });
  }

  /**
   * Get all active devices for wallet
   */
  async getActiveDevices(walletId: string) {
    return this.prisma.keyShare.findMany({
      where: {
        walletId,
        shareType: ShareType.DEVICE,
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    });
  }

  /**
   * Update device last used time
   */
  async touchDevice(walletId: string, deviceId: string) {
    await this.prisma.keyShare.updateMany({
      where: {
        walletId,
        deviceId,
        isActive: true,
      },
      data: {
        lastUsedAt: new Date()
      }
    });
  }
}

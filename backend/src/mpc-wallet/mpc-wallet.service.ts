import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { 
  MPCWalletStatus, 
  ShareType, 
  RecoveryMethod 
} from '@prisma/client';

/**
 * MPC Wallet Service
 * 
 * Manages Multi-Party Computation wallets for Altan citizens.
 * Key shares are distributed across:
 * - Device (browser IndexedDB) - controlled by user
 * - Server (encrypted in DB) - this service manages
 * - Recovery (guardians) - for social recovery
 * 
 * Threshold: 2 of 3 shares required for signing
 */
@Injectable()
export class MPCWalletService {
  private readonly logger = new Logger(MPCWalletService.name);
  
  // Encryption key for server shares (from env)
  private readonly serverShareKey: Buffer;
  
  constructor(private prisma: PrismaService) {
    const keyHex = process.env.SERVER_SHARE_KEY || crypto.randomBytes(32).toString('hex');
    this.serverShareKey = Buffer.from(keyHex, 'hex');
    
    if (!process.env.SERVER_SHARE_KEY) {
      this.logger.warn('SERVER_SHARE_KEY not set! Using random key (will lose access on restart)');
    }
  }

  /**
   * Create new MPC wallet for user
   * Called after user authenticates (social login)
   */
  async createWallet(
    userId: string,
    recoveryMethod: RecoveryMethod = RecoveryMethod.SOCIAL
  ): Promise<{
    address: string;
    deviceShare: string;
    walletId: string;
  }> {
    // Check if user already has wallet
    const existing = await this.prisma.mPCWallet.findUnique({
      where: { userId }
    });
    
    if (existing) {
      throw new BadRequestException('User already has MPC wallet');
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    
    // Split private key into 3 shares (simplified SSS)
    // In production, use proper Shamir's Secret Sharing
    const shares = this.splitKey(privateKey);
    
    // Encrypt server share
    const serverShareEnc = this.encryptShare(shares.serverShare);
    
    // Create wallet record
    const mpcWallet = await this.prisma.mPCWallet.create({
      data: {
        userId,
        address: wallet.address,
        serverShareEnc,
        recoveryMethod,
        status: MPCWalletStatus.ACTIVE,
      }
    });
    
    // Record key share metadata
    await this.prisma.keyShare.createMany({
      data: [
        {
          walletId: mpcWallet.id,
          shareType: ShareType.DEVICE,
          shareIndex: 0,
          publicKey: wallet.address,
        },
        {
          walletId: mpcWallet.id,
          shareType: ShareType.SERVER,
          shareIndex: 1,
          publicKey: wallet.address,
        },
        {
          walletId: mpcWallet.id,
          shareType: ShareType.RECOVERY,
          shareIndex: 2,
          publicKey: wallet.address,
        }
      ]
    });
    
    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: wallet.address,
        walletMigrated: true,
      }
    });
    
    this.logger.log(`Created MPC wallet for user ${userId}: ${wallet.address}`);
    
    return {
      address: wallet.address,
      deviceShare: shares.deviceShare, // Send to client
      walletId: mpcWallet.id,
    };
  }

  /**
   * Get wallet by user ID
   */
  async getWallet(userId: string) {
    const wallet = await this.prisma.mPCWallet.findUnique({
      where: { userId },
      include: {
        keyShares: true,
        guardians: true,
        smartAccount: true,
      }
    });
    
    if (!wallet) {
      throw new NotFoundException('MPC wallet not found');
    }
    
    return wallet;
  }

  /**
   * Reconstruct signer for transaction signing
   * Requires device share from client
   */
  async reconstructSigner(
    walletId: string,
    deviceShare: string
  ): Promise<ethers.Wallet> {
    const wallet = await this.prisma.mPCWallet.findUnique({
      where: { id: walletId }
    });
    
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    if (!wallet.serverShareEnc) {
      throw new BadRequestException('Server share not available');
    }
    
    // Decrypt server share
    const serverShare = this.decryptShare(wallet.serverShareEnc);
    
    // Combine shares to reconstruct private key
    const privateKey = this.combineShares(deviceShare, serverShare);
    
    // Create signer
    const reconstructedWallet = new ethers.Wallet(privateKey);
    
    // Verify address matches
    if (reconstructedWallet.address.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new BadRequestException('Invalid device share - address mismatch');
    }
    
    // Update last used
    await this.prisma.mPCWallet.update({
      where: { id: walletId },
      data: { lastUsedAt: new Date() }
    });
    
    return reconstructedWallet;
  }

  /**
   * Sign transaction using MPC
   */
  async signTransaction(
    walletId: string,
    deviceShare: string,
    transaction: ethers.TransactionRequest
  ): Promise<string> {
    const signer = await this.reconstructSigner(walletId, deviceShare);
    const signedTx = await signer.signTransaction(transaction);
    
    this.logger.log(`Signed transaction for wallet ${walletId}`);
    
    return signedTx;
  }

  /**
   * Sign message using MPC
   */
  async signMessage(
    walletId: string,
    deviceShare: string,
    message: string
  ): Promise<string> {
    const signer = await this.reconstructSigner(walletId, deviceShare);
    const signature = await signer.signMessage(message);
    
    return signature;
  }

  /**
   * Migrate from legacy EmbeddedWallet
   * User provides their old private key, we create MPC shares
   */
  async migrateFromPrivateKey(
    userId: string,
    privateKey: string
  ): Promise<{
    address: string;
    deviceShare: string;
    walletId: string;
  }> {
    // Validate private key
    let wallet: ethers.Wallet;
    try {
      wallet = new ethers.Wallet(privateKey);
    } catch (e) {
      throw new BadRequestException('Invalid private key');
    }
    
    // Check if address matches user's existing wallet
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (user?.walletAddress && 
        user.walletAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new BadRequestException('Private key does not match existing wallet');
    }
    
    // Split into shares
    const shares = this.splitKey(privateKey);
    const serverShareEnc = this.encryptShare(shares.serverShare);
    
    // Create MPC wallet
    const mpcWallet = await this.prisma.mPCWallet.create({
      data: {
        userId,
        address: wallet.address,
        serverShareEnc,
        recoveryMethod: RecoveryMethod.SOCIAL,
        status: MPCWalletStatus.ACTIVE,
      }
    });
    
    // Create share records
    await this.prisma.keyShare.createMany({
      data: [
        { walletId: mpcWallet.id, shareType: ShareType.DEVICE, shareIndex: 0, publicKey: wallet.address },
        { walletId: mpcWallet.id, shareType: ShareType.SERVER, shareIndex: 1, publicKey: wallet.address },
        { walletId: mpcWallet.id, shareType: ShareType.RECOVERY, shareIndex: 2, publicKey: wallet.address },
      ]
    });
    
    // Mark user as migrated
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletMigrated: true,
        walletAddress: wallet.address,
      }
    });
    
    this.logger.log(`Migrated wallet for user ${userId}: ${wallet.address}`);
    
    return {
      address: wallet.address,
      deviceShare: shares.deviceShare,
      walletId: mpcWallet.id,
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Split private key into 3 shares
   * 
   * Simplified implementation using XOR.
   * In production, use Shamir's Secret Sharing for 2-of-3 threshold.
   * 
   * For now: deviceShare XOR serverShare = privateKey
   * Recovery share = copy of serverShare (for social recovery)
   */
  private splitKey(privateKey: string): {
    deviceShare: string;
    serverShare: string;
    recoveryShare: string;
  } {
    // Remove 0x prefix
    const keyBuffer = Buffer.from(privateKey.slice(2), 'hex');
    
    // Generate random share
    const serverShare = crypto.randomBytes(32);
    
    // Device share = privateKey XOR serverShare
    const deviceShare = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      deviceShare[i] = keyBuffer[i] ^ serverShare[i];
    }
    
    return {
      deviceShare: '0x' + deviceShare.toString('hex'),
      serverShare: '0x' + serverShare.toString('hex'),
      recoveryShare: '0x' + serverShare.toString('hex'), // Same as server for now
    };
  }

  /**
   * Combine 2 shares to reconstruct private key
   */
  private combineShares(deviceShare: string, serverShare: string): string {
    const deviceBuffer = Buffer.from(deviceShare.slice(2), 'hex');
    const serverBuffer = Buffer.from(serverShare.slice(2), 'hex');
    
    const privateKey = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      privateKey[i] = deviceBuffer[i] ^ serverBuffer[i];
    }
    
    return '0x' + privateKey.toString('hex');
  }

  /**
   * Encrypt share for server storage
   */
  private encryptShare(share: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.serverShareKey, iv);
    
    let encrypted = cipher.update(share, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt server share
   */
  private decryptShare(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.serverShareKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

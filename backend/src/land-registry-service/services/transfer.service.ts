import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient, TransactionStatus } from '@prisma/client-land';
import { VerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransferService {
  constructor(
    @Inject('LAND_PRISMA') private landPrisma: PrismaClient,
    private mainPrisma: PrismaService, // Main DB for user verification
  ) {}

  /**
   * Initiate property transfer (sale)
   * IMPORTANT: Both parties must be citizens
   */
  async initiateTransfer(data: {
    landPlotId?: string;
    propertyId?: string;
    sellerId: string;
    buyerId: string;
    transactionAmount: number;
    contractHash?: string;
  }) {
    // Verify seller owns the property
    const ownership = await this.landPrisma.ownership.findFirst({
      where: {
        ownerId: data.sellerId,
        landPlotId: data.landPlotId,
        propertyId: data.propertyId,
        isActive: true,
      },
    });

    if (!ownership) {
      throw new ForbiddenException('Seller does not own this property');
    }

    // Verify both parties are citizens
    const isBuyerCitizen = await this.checkCitizenship(data.buyerId);
    if (!isBuyerCitizen) {
      throw new ForbiddenException('Buyer must be a verified citizen to purchase land');
    }
    
    const isSellerCitizen = await this.checkCitizenship(data.sellerId);
    if (!isSellerCitizen) {
      throw new ForbiddenException('Seller citizenship not verified');
    }

    // Create transaction record
    return this.landPrisma.transaction.create({
      data: {
        ...data,
        transactionType: 'SALE',
        status: TransactionStatus.PENDING,
      },
    });
  }

  /**
   * Check if user is a verified citizen
   */
  private async checkCitizenship(userId: string): Promise<boolean> {
    const user = await this.mainPrisma.user.findUnique({
      where: { id: userId },
      select: { verificationLevel: true },
    });
    
    if (!user) {
      return false;
    }
    
    // User must be FULLY_VERIFIED to own land
    return user.verificationLevel === VerificationLevel.FULLY_VERIFIED;
  }

  /**
   * Buyer confirms and pays
   */
  async confirmPayment(data: {
    transactionId: string;
    buyerId: string;
    paymentTxHash: string; // Blockchain payment proof
  }) {
    const transaction = await this.landPrisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== data.buyerId) {
      throw new ForbiddenException('Not authorized');
    }

    // Update transaction with payment proof
    return this.landPrisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        paymentTxHash: data.paymentTxHash,
        status: TransactionStatus.VERIFIED,
      },
    });
  }

  /**
   * Registry officer completes transfer
   */
  async completeTransfer(data: {
    transactionId: string;
    officerId: string;
    blockchainTxHash?: string;
  }) {
    const transaction = await this.landPrisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.VERIFIED) {
      throw new ForbiddenException('Transaction must be verified before completion');
    }

    // Deactivate old ownership
    await this.landPrisma.ownership.updateMany({
      where: {
        ownerId: transaction.sellerId!,
        landPlotId: transaction.landPlotId,
        propertyId: transaction.propertyId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Create new ownership for buyer
    const certificateNumber = await this.generateCertificateNumber();
    // Verify buyer citizenship from main DB
    const isBuyerCitizen = await this.checkCitizenship(transaction.buyerId!);
    
    await this.landPrisma.ownership.create({
      data: {
        landPlotId: transaction.landPlotId,
        propertyId: transaction.propertyId,
        ownerId: transaction.buyerId!,
        ownershipType: 'FULL_OWNERSHIP',
        isCitizenVerified: isBuyerCitizen,
        verifiedAt: new Date(),
        certificateNumber,
      },
    });

    // Complete transaction
    return this.landPrisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        status: TransactionStatus.COMPLETED,
        verifiedBy: data.officerId,
        verifiedAt: new Date(),
        completedAt: new Date(),
        blockchainTxHash: data.blockchainTxHash,
      },
    });
  }

  /**
   * Get transaction history for property
   */
  async getTransactionHistory(landPlotId?: string, propertyId?: string) {
    return this.landPrisma.transaction.findMany({
      where: {
        landPlotId,
        propertyId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generate certificate number
   */
  private async generateCertificateNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.landPrisma.ownership.count({
      where: {
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequential = String(count + 1).padStart(5, '0');
    return `OWN-${dateStr}-${sequential}`;
  }
}

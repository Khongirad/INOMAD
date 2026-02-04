import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient, TransactionStatus } from '@prisma/client-land';

@Injectable()
export class TransferService {
  constructor(
    @Inject('LAND_PRISMA') private prisma: PrismaClient,
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
    const ownership = await this.prisma.ownership.findFirst({
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
    // TODO: Integrate with main DB to check citizenship
    // For now, check ownership citizenship flag
    if (!ownership.isCitizenVerified) {
      throw new ForbiddenException('Seller citizenship not verified');
    }

    // Create transaction record
    return this.prisma.transaction.create({
      data: {
        ...data,
        transactionType: 'SALE',
        status: TransactionStatus.PENDING,
      },
    });
  }

  /**
   * Buyer confirms and pays
   */
  async confirmPayment(data: {
    transactionId: string;
    buyerId: string;
    paymentTxHash: string; // Blockchain payment proof
  }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== data.buyerId) {
      throw new ForbiddenException('Not authorized');
    }

    // Update transaction with payment proof
    return this.prisma.transaction.update({
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
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.VERIFIED) {
      throw new ForbiddenException('Transaction must be verified before completion');
    }

    // Deactivate old ownership
    await this.prisma.ownership.updateMany({
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
    
    await this.prisma.ownership.create({
      data: {
        landPlotId: transaction.landPlotId,
        propertyId: transaction.propertyId,
        ownerId: transaction.buyerId!,
        ownershipType: 'FULL_OWNERSHIP',
        isCitizenVerified: true, // TODO: Verify buyer citizenship
        verifiedAt: new Date(),
        certificateNumber,
      },
    });

    // Complete transaction
    return this.prisma.transaction.update({
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
    return this.prisma.transaction.findMany({
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
    
    const count = await this.prisma.ownership.count({
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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LandRegistryServiceService {
  constructor(private prisma: PrismaService) {}

  // ===== Cadastral =====

  async registerLandPlot(userId: string, data: {
    region: string;
    district: string;
    locality?: string;
    address?: string;
    latitude: number;
    longitude: number;
    boundaries?: any;
    area: number;
    landType: string;
    soilQuality?: string;
    irrigated: boolean;
  }) {
    const cadastralNumber = `${data.region.substring(0, 2).toUpperCase()}-${data.district.substring(0, 2).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.landPlot.create({
      data: {
        cadastralNumber,
        region: data.region,
        district: data.district,
        locality: data.locality,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        boundaries: data.boundaries,
        area: data.area,
        landType: data.landType as any,
        soilQuality: data.soilQuality,
        irrigated: data.irrigated,
        registeredById: userId,
      },
    });
  }

  async getLandPlotByCadastral(cadastralNumber: string) {
    const plot = await this.prisma.landPlot.findUnique({
      where: { cadastralNumber },
      include: { properties: true, ownerships: true },
    });
    if (!plot) throw new NotFoundException('Land plot not found');
    return plot;
  }

  async searchLandPlots(params: {
    region?: string;
    district?: string;
    locality?: string;
    landType?: string;
  }) {
    const where: any = {};
    if (params.region) where.region = params.region;
    if (params.district) where.district = params.district;
    if (params.locality) where.locality = params.locality;
    if (params.landType) where.landType = params.landType;

    return this.prisma.landPlot.findMany({
      where,
      include: { properties: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async searchLandPlotsByGPS(bounds: {
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  }) {
    return this.prisma.landPlot.findMany({
      where: {
        latitude: {
          gte: bounds.southWest.lat,
          lte: bounds.northEast.lat,
        },
        longitude: {
          gte: bounds.southWest.lng,
          lte: bounds.northEast.lng,
        },
      },
      include: { properties: true },
      take: 200,
    });
  }

  // ===== Ownership =====

  async getMyOwnerships(userId: string) {
    return this.prisma.landOwnership.findMany({
      where: { ownerId: userId, isActive: true },
      include: { landPlot: true, property: true },
    });
  }

  async registerOwnership(userId: string, data: {
    landPlotId?: string;
    propertyId?: string;
    ownershipType: 'FULL' | 'SHARED';
    sharePercentage: number;
    coOwners?: string[];
  }) {
    // Verify citizen
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.landOwnership.create({
      data: {
        landPlotId: data.landPlotId,
        propertyId: data.propertyId,
        ownerId: userId,
        ownershipType: data.ownershipType,
        sharePercentage: data.sharePercentage,
        isCitizenVerified: user.isVerified,
        coOwners: data.coOwners || [],
      },
      include: { landPlot: true, property: true },
    });
  }

  // ===== Leases =====

  async getMyLeases(userId: string) {
    return this.prisma.landLease.findMany({
      where: { lesseeId: userId, isActive: true },
      include: { property: true },
    });
  }

  async registerLease(data: {
    propertyId: string;
    lesseeId: string;
    lesseeName: string;
    lesseeNationality: string;
    leaseType: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    currency: string;
  }) {
    return this.prisma.landLease.create({
      data: {
        propertyId: data.propertyId,
        lesseeId: data.lesseeId,
        lesseeName: data.lesseeName,
        lesseeNationality: data.lesseeNationality,
        leaseType: data.leaseType as any,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        monthlyRent: data.monthlyRent,
        currency: data.currency || 'ALTAN',
      },
      include: { property: true },
    });
  }

  // ===== Transactions =====

  async getTransactionHistory(landPlotId?: string, propertyId?: string) {
    const where: any = {};
    if (landPlotId) where.landPlotId = landPlotId;
    if (propertyId) where.propertyId = propertyId;

    return this.prisma.landTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async initiateTransfer(userId: string, data: {
    landPlotId?: string;
    propertyId?: string;
    buyerId: string;
    salePrice: number;
    currency: string;
  }) {
    const seller = await this.prisma.user.findUnique({ where: { id: userId } });
    const buyer = await this.prisma.user.findUnique({ where: { id: data.buyerId } });
    if (!seller || !buyer) throw new NotFoundException('User not found');

    return this.prisma.landTransaction.create({
      data: {
        type: 'SALE',
        landPlotId: data.landPlotId,
        propertyId: data.propertyId,
        sellerId: userId,
        buyerId: data.buyerId,
        sellerName: seller.username || seller.id,
        buyerName: buyer.username || buyer.id,
        salePrice: data.salePrice,
        currency: data.currency || 'ALTAN',
        status: 'INITIATED',
      },
    });
  }

  async confirmPayment(transactionId: string, paymentTxHash: string) {
    const tx = await this.prisma.landTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'INITIATED' && tx.status !== 'PAYMENT_PENDING') {
      throw new BadRequestException('Transaction not in payable state');
    }

    return this.prisma.landTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paymentTxHash,
        paidAt: new Date(),
      },
    });
  }

  async completeTransfer(transactionId: string, officerId: string, blockchainTxHash?: string) {
    const tx = await this.prisma.landTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'PAYMENT_CONFIRMED') {
      throw new BadRequestException('Payment must be confirmed first');
    }

    // Transfer ownership
    if (tx.landPlotId) {
      await this.prisma.landOwnership.updateMany({
        where: { landPlotId: tx.landPlotId, ownerId: tx.sellerId, isActive: true },
        data: { isActive: false },
      });
      await this.prisma.landOwnership.create({
        data: {
          landPlotId: tx.landPlotId,
          ownerId: tx.buyerId,
          ownershipType: 'FULL',
          sharePercentage: 100,
          isCitizenVerified: true,
        },
      });
    }
    if (tx.propertyId) {
      await this.prisma.landOwnership.updateMany({
        where: { propertyId: tx.propertyId, ownerId: tx.sellerId, isActive: true },
        data: { isActive: false },
      });
      await this.prisma.landOwnership.create({
        data: {
          propertyId: tx.propertyId,
          ownerId: tx.buyerId,
          ownershipType: 'FULL',
          sharePercentage: 100,
          isCitizenVerified: true,
        },
      });
    }

    return this.prisma.landTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        completedById: officerId,
        completedAt: new Date(),
        blockchainTxHash,
      },
    });
  }

  // ===== Valuation =====

  async calculateValuation(landPlotId?: string, propertyId?: string) {
    let baseValue = 10000;

    if (landPlotId) {
      const plot = await this.prisma.landPlot.findUnique({ where: { id: landPlotId } });
      if (!plot) throw new NotFoundException('Land plot not found');
      baseValue = plot.area * 50; // 50 ALTAN per sq meter base
    }

    if (propertyId) {
      const prop = await this.prisma.landProperty.findUnique({ where: { id: propertyId } });
      if (prop) {
        baseValue += (prop.buildingArea || 0) * 200; // 200 ALTAN per building sq meter
      }
    }

    return {
      landPlotId,
      propertyId,
      estimatedValue: baseValue,
      currency: 'ALTAN',
      valuationDate: new Date(),
      factors: {
        baseValue,
        locationMultiplier: 1.0,
        ageAdjustment: 1.0,
        conditionMultiplier: 1.0,
      },
    };
  }

  async getMarketTrends(region: string) {
    const plots = await this.prisma.landPlot.count({ where: { region } });
    const transactions = await this.prisma.landTransaction.count({
      where: { landPlot: { region }, status: 'COMPLETED' },
    });

    return {
      region,
      totalPlots: plots,
      totalTransactions: transactions,
      averagePricePerSqm: 50, // placeholder
      trend: 'STABLE',
      lastUpdated: new Date(),
    };
  }
}

import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * LandRegistryService — Земельный Кодекс
 *
 * КЛЮЧЕВЫЕ ПРАВИЛА:
 * 1. Вся земля принадлежит коренному народу и распределяется через Земельный Фонд.
 * 2. Граждане (CITIZEN, INDIGENOUS) имеют право ВЛАДЕТЬ землёй.
 * 3. Иностранцы (FOREIGNER) — только АРЕНДА через Земельный Фонд.
 * 4. Земля может продаваться, покупаться и дариться ТОЛЬКО между гражданами
 *    вне зависимости от пола и вероисповедания.
 * 5. Некоренные граждане (CITIZEN) НЕ МОГУТ отчуждать, продавать или сдавать
 *    землю иностранцам. Запрет на отделение/отчуждение.
 * 6. Земельный Фонд обладает исключительным правом на аренду иностранцам.
 * 7. Земельный Фонд подчиняется Хуралу.
 * 8. Коренной статус передаётся по мужской линии (отец → сын).
 */
@Injectable()
export class LandRegistryServiceService {
  private readonly logger = new Logger(LandRegistryServiceService.name);

  constructor(private prisma: PrismaService) {}

  // ===== Helpers =====

  /** Check if user is a citizen (CITIZEN or INDIGENOUS) */
  private isCitizen(citizenType: string): boolean {
    return citizenType === 'CITIZEN' || citizenType === 'INDIGENOUS';
  }

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

  /**
   * Register ownership of land or property.
   *
   * ЗЕМЕЛЬНЫЙ КОДЕКС:
   * - Граждане (CITIZEN, INDIGENOUS) могут владеть землёй и строениями.
   * - Иностранцы (FOREIGNER) и жители (RESIDENT) НЕ МОГУТ владеть — только аренда.
   */
  async registerOwnership(userId: string, data: {
    landPlotId?: string;
    propertyId?: string;
    ownershipType: 'FULL' | 'SHARED';
    sharePercentage: number;
    coOwners?: string[];
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ct = (user as any).citizenType as string;

    // GOVERNANCE: Only citizens can own land and property
    if (!this.isCitizen(ct)) {
      throw new ForbiddenException(
        'Только граждане (CITIZEN или INDIGENOUS) могут владеть землёй и недвижимостью. ' +
        'Иностранцы могут арендовать через Земельный Фонд.',
      );
    }

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
      include: { landPlot: true, property: true },
    });
  }

  /**
   * Register a lease on a land plot or property.
   *
   * ЗЕМЕЛЬНЫЙ КОДЕКС:
   * - Только Земельный Фонд имеет право сдавать в аренду иностранцам.
   * - Иностранцы (FOREIGNER) — единственные кто арендует (граждане владеют).
   * - Арендная плата поступает в Земельный Фонд.
   * - Аренда может быть на земельный участок (landPlotId) и/или строение (propertyId).
   */
  async registerLease(data: {
    landPlotId?: string;
    propertyId?: string;
    lesseeId: string;
    lesseeName: string;
    lesseeNationality: string;
    leaseType: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    currency: string;
  }) {
    if (!data.landPlotId && !data.propertyId) {
      throw new BadRequestException('Необходимо указать landPlotId или propertyId для аренды.');
    }

    // Verify lessee is FOREIGNER
    const lessee = await this.prisma.user.findUnique({ where: { id: data.lesseeId } });
    if (!lessee) throw new NotFoundException('Lessee not found');

    const ct = (lessee as any).citizenType as string;
    if (this.isCitizen(ct)) {
      throw new BadRequestException(
        'Граждане (CITIZEN/INDIGENOUS) имеют право ВЛАДЕТЬ землёй, а не арендовать. ' +
        'Используйте registerOwnership для оформления собственности.',
      );
    }

    this.logger.log(
      `Land Fund lease: plot=${data.landPlotId || 'N/A'}, property=${data.propertyId || 'N/A'}, lessee=${data.lesseeId} (${ct})`,
    );

    return this.prisma.landLease.create({
      data: {
        landPlotId: data.landPlotId,
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
      include: { landPlot: true, property: true },
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

  /**
   * Initiate a land/property transfer (sale, gift, inheritance).
   *
   * ЗЕМЕЛЬНЫЙ КОДЕКС:
   * - Земля продаётся, покупается и дарится ТОЛЬКО МЕЖДУ ГРАЖДАНАМИ
   *   вне зависимости от пола и вероисповедания.
   * - Иностранцы НЕ МОГУТ покупать или продавать землю.
   * - Некоренные граждане не могут продавать/отчуждать землю иностранцам.
   */
  async initiateTransfer(userId: string, data: {
    landPlotId?: string;
    propertyId?: string;
    buyerId: string;
    salePrice: number;
    currency: string;
  }) {
    const [seller, buyer] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: data.buyerId } }),
    ]);
    if (!seller || !buyer) throw new NotFoundException('User not found');

    const sellerCt = (seller as any).citizenType as string;
    const buyerCt = (buyer as any).citizenType as string;

    // GOVERNANCE: Only citizens can participate in land transactions
    if (!this.isCitizen(sellerCt)) {
      throw new ForbiddenException(
        'Только граждане могут продавать или дарить землю и недвижимость.',
      );
    }
    if (!this.isCitizen(buyerCt)) {
      throw new ForbiddenException(
        'Земля и недвижимость могут передаваться только гражданам. ' +
        'Иностранцы могут арендовать через Земельный Фонд.',
      );
    }

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

  /**
   * Complete transfer of land/property.
   *
   * ЗЕМЕЛЬНЫЙ КОДЕКС:
   * - Земля и строения передаются ТОЛЬКО МЕЖДУ ГРАЖДАНАМИ.
   * - Покупатель должен быть CITIZEN или INDIGENOUS.
   */
  async completeTransfer(transactionId: string, officerId: string, blockchainTxHash?: string) {
    const tx = await this.prisma.landTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'PAYMENT_CONFIRMED') {
      throw new BadRequestException('Payment must be confirmed first');
    }

    // GOVERNANCE: Verify buyer is still a citizen at time of completion
    const buyer = await this.prisma.user.findUnique({ where: { id: tx.buyerId } });
    if (!buyer) throw new NotFoundException('Buyer not found');
    const buyerCt = (buyer as any).citizenType as string;
    if (!this.isCitizen(buyerCt)) {
      throw new ForbiddenException(
        'Покупатель должен быть гражданином для завершения сделки.',
      );
    }

    // Transfer ownership: deactivate seller's, create buyer's
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
          isCitizenVerified: buyer.isVerified,
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
          isCitizenVerified: buyer.isVerified,
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

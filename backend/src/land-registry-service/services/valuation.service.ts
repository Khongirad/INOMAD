import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient, PropertyType } from '@prisma/client-land';

@Injectable()
export class ValuationService {
  constructor(
    @Inject('LAND_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Calculate property valuation
   */
  async calculateValuation(params: {
    landPlotId?: string;
    propertyId?: string;
  }): Promise<number> {
    if (params.landPlotId) {
      return this.valuateLandPlot(params.landPlotId);
    } else if (params.propertyId) {
      return this.valuateProperty(params.propertyId);
    }
    
    throw new Error('Must provide either landPlotId or propertyId');
  }

  /**
   * Valuate land plot
   */
  private async valuateLandPlot(landPlotId: string): Promise<number> {
    const landPlot = await this.prisma.landPlot.findUnique({
      where: { id: landPlotId },
    });

    if (!landPlot) {
      throw new Error('Land plot not found');
    }

    // Simplified valuation formula
    // In production, use complex market data, location factors, etc.
    
    const baseRate = this.getBaseRateByType(landPlot.propertyType);
    const locationMultiplier = this.getLocationMultiplier(landPlot.region, landPlot.district);
    const restrictionDiscount = this.getRestrictionDiscount(landPlot.restrictions);

    const valuation = Number(landPlot.area) * baseRate * locationMultiplier * restrictionDiscount;

    // Update land plot with valuation
    await this.prisma.landPlot.update({
      where: { id: landPlotId },
      data: {
        assessedValue: valuation,
        lastValuationDate: new Date(),
      },
    });

    return valuation;
  }

  /**
   * Valuate property/building
   */
  private async valuateProperty(propertyId: string): Promise<number> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { landPlot: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Building valuation
    const buildingRate = this.getBuildingRateByType(property.propertyType);
    const areaValue = Number(property.totalArea || 0) * buildingRate;
    
    // Age depreciation
    const ageDepreciation = this.getAgeDepreciation(property.yearBuilt);
    
    // Land value
    const landValue = Number(property.landPlot.assessedValue || 0);

    const valuation = (areaValue * ageDepreciation) + landValue;

    // Update property with valuation
    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        assessedValue: valuation,
        lastValuationDate: new Date(),
      },
    });

    return valuation;
  }

  /**
   * Get base rate per square meter by property type
   */
  private getBaseRateByType(type: PropertyType): number {
    const rates = {
      RESIDENTIAL: 500,
      COMMERCIAL: 1000,
      AGRICULTURAL: 100,
      INDUSTRIAL: 750,
      MIXED_USE: 800,
      VACANT_LAND: 200,
    };

    return rates[type] || 300;
  }

  /**
   * Get building rate per square meter
   */
  private getBuildingRateByType(type: PropertyType): number {
    const rates = {
      RESIDENTIAL: 1500,
      COMMERCIAL: 2500,
      AGRICULTURAL: 500,
      INDUSTRIAL: 1200,
      MIXED_USE: 2000,
      VACANT_LAND: 0,
    };

    return rates[type] || 1000;
  }

  /**
   * Get location multiplier
   */
  private getLocationMultiplier(region: string, district: string): number {
    // TODO: Use real market data
    // Central regions have higher multipliers
    const regionMultipliers: Record<string, number> = {
      'Central': 1.5,
      'Northern': 1.2,
      'Southern': 1.1,
      'Eastern': 1.0,
      'Western': 0.9,
    };

    return regionMultipliers[region] || 1.0;
  }

  /**
   * Calculate restriction discount
   */
  private getRestrictionDiscount(restrictions: string[]): number {
    if (!restrictions || restrictions.length === 0) {
      return 1.0;
    }

    // Each restriction reduces value by 5%
    const discountPerRestriction = 0.05;
    const totalDiscount = Math.min(restrictions.length * discountPerRestriction, 0.5); // Max 50% discount

    return 1.0 - totalDiscount;
  }

  /**
   * Calculate age depreciation
   */
  private getAgeDepreciation(yearBuilt?: number): number {
    if (!yearBuilt) {
      return 1.0;
    }

    const currentYear = new Date().getFullYear();
    const age = currentYear - yearBuilt;

    // 1% depreciation per year, minimum 0.5 (50% of original value)
    const depreciation = Math.max(1.0 - (age * 0.01), 0.5);

    return depreciation;
  }

  /**
   * Get market trends for region
   */
  async getMarketTrends(region: string) {
    // TODO: Implement market trend analysis
    // For now, return placeholder data
    return {
      region,
      averagePrice: 500,
      priceChange: '+5%',
      transactionVolume: 120,
    };
  }
}

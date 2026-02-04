import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-land';

@Injectable()
export class CadastralMapService {
  constructor(
    @Inject('LAND_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Register new land plot with GPS coordinates
   */
  async registerLandPlot(data: {
    region: string;
    district: string;
    locality: string;
    addressLine?: string;
    boundaries: any; // GeoJSON polygon
    area: number;
    propertyType: any;
    permittedUse: string[];
    restrictions?: string[];
    registeredBy: string;
  }) {
    // Generate cadastral number
    const cadastralNumber = await this.generateCadastralNumber(data.region, data.district);

    // Calculate center point from boundaries
    const { centerLat, centerLon } = this.calculateCenterPoint(data.boundaries);

    return this.prisma.landPlot.create({
      data: {
        ...data,
        cadastralNumber,
        centerLat,
        centerLon,
      },
    });
  }

  /**
   * Search land plots by location
   */
  async searchByLocation(params: {
    region?: string;
    district?: string;
    locality?: string;
  }) {
    return this.prisma.landPlot.findMany({
      where: {
        region: params.region,
        district: params.district,
        locality: params.locality,
      },
    });
  }

  /**
   * Search by cadastral number
   */
  async searchByCadastralNumber(cadastralNumber: string) {
    return this.prisma.landPlot.findUnique({
      where: { cadastralNumber },
      include: {
        properties: true,
        ownerships: {
          where: { isActive: true },
        },
        leases: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  /**
   * Get land plots within GPS bounds
   */
  async searchByGPSBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) {
    // Note: This is a simplified version
    // In production, use PostGIS for proper geospatial queries
    return this.prisma.landPlot.findMany({
      where: {
        centerLat: {
          gte: bounds.minLat,
          lte: bounds.maxLat,
        },
        centerLon: {
          gte: bounds.minLon,
          lte: bounds.maxLon,
        },
      },
    });
  }

  /**
   * Generate unique cadastral number
   */
  private async generateCadastralNumber(region: string, district: string): Promise<string> {
    // Format: RR-DD-YYYYMMDD-XXXXX
    // RR = Region code (2 chars)
    // DD = District code (2 chars)
    // YYYYMMDD = Date
    // XXXXX = Sequential number
    
    const regionCode = this.getRegionCode(region);
    const districtCode = this.getDistrictCode(district);
    
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.prisma.landPlot.count({
      where: {
        region,
        district,
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequential = String(count + 1).padStart(5, '0');
    return `${regionCode}-${districtCode}-${dateStr}-${sequential}`;
  }

  /**
   * Get region code (2 characters)
   */
  private getRegionCode(region: string): string {
    // TODO: Map region names to codes
    // For now, use first 2 chars uppercase
    return region.substring(0, 2).toUpperCase();
  }

  /** 
   * Get district code (2 characters)
   */
  private getDistrictCode(district: string): string {
    // TODO: Map district names to codes
    return district.substring(0, 2).toUpperCase();
  }

  /**
   * Calculate center point from GeoJSON polygon
   */
  private calculateCenterPoint(boundaries: any): { centerLat: number; centerLon: number } {
    // Simplified centroid calculation
    // In production, use proper GIS library (turf.js, etc.)
    
    if (boundaries.type !== 'Polygon' || !boundaries.coordinates || !boundaries.coordinates[0]) {
      throw new Error('Invalid GeoJSON polygon');
    }

    const points = boundaries.coordinates[0];
    let sumLat = 0;
    let sumLon = 0;
    
    for (const point of points) {
      sumLon += point[0];
      sumLat += point[1];
    }

    return {
      centerLat: sumLat / points.length,
      centerLon: sumLon / points.length,
    };
  }
}

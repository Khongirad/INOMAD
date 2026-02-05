import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaClient, OwnershipType } from '@prisma/client-land';
import { PrismaService } from '../../prisma/prisma.service'; // Main DB for User data
import { VerificationLevel } from '@prisma/client'; // For citizenship checks

@Injectable()
export class OwnershipService {
  private readonly logger = new Logger(OwnershipService.name);

  constructor(
    @Inject('LAND_PRISMA') private prisma: PrismaClient,
    private mainPrisma: PrismaService, // Main DB for User queries
  ) {}

  /**
   * Register land/property ownership
   * IMPORTANT: Only citizens can own land
   */
  async registerOwnership(data: {
    landPlotId?: string;
    propertyId?: string;
    ownerId: string;
    ownershipType: OwnershipType;
    ownershipShare?: number;
    jointOwnerIds?: string[];
  }) {
    // CRITICAL: Verify citizenship
    const isCitizen = await this.verifyCitizenship(data.ownerId);
    
    if (!isCitizen) {
      throw new ForbiddenException(
        'Only citizens of Siberian Confederation can own land and property. ' +
        'Foreigners may apply for a lease agreement instead.'
      );
    }

    // If joint ownership, verify ALL co-owners are citizens
    if (data.jointOwnerIds && data.jointOwnerIds.length > 0) {
      for (const coOwnerId of data.jointOwnerIds) {
        const isCoOwnerCitizen = await this.verifyCitizenship(coOwnerId);
        if (!isCoOwnerCitizen) {
          throw new ForbiddenException(
            `Co-owner ${coOwnerId} is not a citizen. All co-owners must be citizens.`
          );
        }
      }
    }

    // Generate certificate number
    const certificateNumber = await this.generateCertificateNumber();

    return this.prisma.ownership.create({
      data: {
        landPlotId: data.landPlotId,
        propertyId: data.propertyId,
        ownerId: data.ownerId,
        ownershipType: data.ownershipType,
        ownershipShare: data.ownershipShare || 100,
        isJointOwnership: (data.jointOwnerIds?.length || 0) > 0,
        jointOwnerIds: data.jointOwnerIds || [],
        isCitizenVerified: true,
        verifiedAt: new Date(),
        certificateNumber,
      },
    });
  }

  /**
   * Register lease for foreigners (or citizens who want to rent)
   */
  async registerLease(data: {
    landPlotId?: string;
    propertyId?: string;
    lessorId: string; // Owner (must be citizen)
    lesseeId: string; // Tenant (can be foreigner)
    leaseType: any;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    depositAmount: number;
    terms: string;
  }) {
    // Verify lessor is citizen and actually owns the property
    const isLessorCitizen = await this.verifyCitizenship(data.lessorId);
    if (!isLessorCitizen) {
      throw new ForbiddenException('Lessor must be a citizen');
    }

    // Verify lessor owns the property
    const ownership = await this.prisma.ownership.findFirst({
      where: {
        ownerId: data.lessorId,
        landPlotId: data.landPlotId,
        propertyId: data.propertyId,
        isActive: true,
      },
    });

    if (!ownership) {
      throw new ForbiddenException('Lessor does not own this property');
    }

    // Check if lessee is foreigner
    const isLesseeCitizen = await this.verifyCitizenship(data.lesseeId);

    // Generate lease number
    const leaseNumber = await this.generateLeaseNumber();

    return this.prisma.lease.create({
      data: {
        ...data,
        isForeignLessee: !isLesseeCitizen,
        leaseNumber,
        status: 'PENDING', // Requires registry approval
        registeredBy: 'system', // TODO: Get from context
      },
    });
  }

  /**
   * Verify citizenship for land ownership
   * Only Siberian Confederation citizens can own land
   */
  private async verifyCitizenship(userId: string): Promise<boolean> {
    const user = await this.mainPrisma.user.findUnique({
      where: { id: userId },
      select: { 
        nationality: true, 
        verificationLevel: true 
      },
    });
    
    if (!user) {
      this.logger.warn(`User ${userId} not found during citizenship check`);
      return false;
    }
    
    // Must be Siberian Confederation citizen AND fully verified
    const isCitizen = user.nationality === 'Siberian Confederation';
    const isFullyVerified = user.verificationLevel === VerificationLevel.FULLY_VERIFIED;
    
    if (!isCitizen) {
      this.logger.log(`User ${userId} is not a Siberian Confederation citizen`);
    }
    
    return isCitizen && isFullyVerified;
  }

  /**
   * Generate unique certificate number for ownership
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

  /**
   * Generate unique lease number
   */
  private async generateLeaseNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.prisma.lease.count({
      where: {
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequential = String(count + 1).padStart(5, '0');
    return `LSE-${dateStr}-${sequential}`;
  }

  /**
   * Get ownership by user
   */
  async getOwnershipsByUser(userId: string) {
    return this.prisma.ownership.findMany({
      where: { ownerId: userId, isActive: true },
      include: {
        landPlot: true,
        property: true,
      },
    });
  }

  /**
   * Get leases by user (as lessee)
   */
  async getLeasesByUser(userId: string) {
    return this.prisma.lease.findMany({
      where: { lesseeId: userId, status: 'ACTIVE' },
      include: {
        landPlot: true,
        property: true,
      },
    });
  }
}

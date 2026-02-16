import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZagsServiceService {
  constructor(private prisma: PrismaService) {}

  async checkEligibility(userId: string) {
    // Check user profile for age
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, dateOfBirth: true },
    });

    // Check if user has active marriage
    const activeMarriage = await this.prisma.marriage.findFirst({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
        status: 'REGISTERED',
      },
    });

    // Check for pending divorce
    const pendingDivorce = activeMarriage
      ? await this.prisma.zagsDivorce.findFirst({
          where: {
            marriageId: activeMarriage.id,
            status: { in: ['FILED', 'UNDER_REVIEW'] },
          },
        })
      : null;

    const currentStatus = activeMarriage ? 'MARRIED' : 'SINGLE';
    const reasons: string[] = [];

    if (activeMarriage) {
      reasons.push('Already married');
      if (pendingDivorce) {
        reasons.push('Divorce proceedings in progress');
      }
    }

    // Age check — must be 18+
    if (user?.dateOfBirth) {
      const age = Math.floor(
        (Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < 18) {
        reasons.push(`Must be at least 18 years old (current age: ${age})`);
      }
    } else {
      reasons.push('Date of birth not on file — update your profile first');
    }

    const isEligible = reasons.length === 0;
    return { isEligible, currentStatus, reasons };
  }

  async createMarriageApplication(userId: string, data: {
    partnerId: string;
    spouse1FullName: string;
    spouse2FullName: string;
    spouse1DateOfBirth: string;
    spouse2DateOfBirth: string;
    marriageDate: string;
    ceremonyLocation?: string;
    ceremonyType?: 'Civil' | 'Religious' | 'Traditional';
    witness1Name?: string;
    witness2Name?: string;
    witness1Id?: string;
    witness2Id?: string;
    propertyRegime?: 'SEPARATE' | 'JOINT' | 'CUSTOM';
    propertyAgreement?: string;
  }) {
    // Cannot marry yourself
    if (userId === data.partnerId) {
      throw new BadRequestException('Cannot marry yourself');
    }

    // Verify eligibility for both parties
    const [elig1, elig2] = await Promise.all([
      this.checkEligibility(userId),
      this.checkEligibility(data.partnerId),
    ]);

    if (!elig1.isEligible) {
      throw new BadRequestException(`Initiator not eligible: ${elig1.reasons.join(', ')}`);
    }
    if (!elig2.isEligible) {
      throw new BadRequestException(`Partner not eligible: ${elig2.reasons.join(', ')}`);
    }

    const ceremonyMap: Record<string, any> = {
      'Civil': 'CIVIL',
      'Religious': 'RELIGIOUS',
      'Traditional': 'TRADITIONAL',
    };

    const marriage = await this.prisma.marriage.create({
      data: {
        spouse1Id: userId,
        spouse2Id: data.partnerId,
        spouse1FullName: data.spouse1FullName,
        spouse2FullName: data.spouse2FullName,
        spouse1DateOfBirth: new Date(data.spouse1DateOfBirth),
        spouse2DateOfBirth: new Date(data.spouse2DateOfBirth),
        marriageDate: new Date(data.marriageDate),
        ceremonyLocation: data.ceremonyLocation,
        ceremonyType: data.ceremonyType ? ceremonyMap[data.ceremonyType] : null,
        witness1Name: data.witness1Name,
        witness2Name: data.witness2Name,
        witness1Id: data.witness1Id,
        witness2Id: data.witness2Id,
        propertyRegime: data.propertyRegime,
        propertyAgreement: data.propertyAgreement,
        status: 'PENDING_CONSENT',
        // Auto-grant consent for the initiator
        spouse1ConsentGranted: true,
        spouse1ConsentedAt: new Date(),
      },
    });

    // Create consent records for both spouses
    await this.prisma.marriageConsent.createMany({
      data: [
        { marriageId: marriage.id, userId, status: 'APPROVED', consentedAt: new Date() },
        { marriageId: marriage.id, userId: data.partnerId, status: 'PENDING' },
      ],
    });

    return marriage;
  }

  async getMyMarriages(userId: string) {
    return this.prisma.marriage.findMany({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
      },
      include: { consents: true, divorces: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMarriage(marriageId: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
      include: { consents: true, divorces: true },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    return marriage;
  }

  async getPendingConsents(userId: string) {
    return this.prisma.marriageConsent.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: { marriage: true },
    });
  }

  async grantConsent(userId: string, marriageId: string, approve: boolean, signature?: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
      include: { consents: true },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');

    // Update consent
    await this.prisma.marriageConsent.updateMany({
      where: { marriageId, userId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        consentedAt: new Date(),
        signature,
      },
    });

    // Update marriage consent flags
    const updateData: any = {};
    if (marriage.spouse1Id === userId) {
      updateData.spouse1ConsentGranted = approve;
      updateData.spouse1ConsentedAt = new Date();
    } else if (marriage.spouse2Id === userId) {
      updateData.spouse2ConsentGranted = approve;
      updateData.spouse2ConsentedAt = new Date();
    }

    // Check if both consents are granted → move to PENDING_REVIEW
    const updatedMarriage = await this.prisma.marriage.update({
      where: { id: marriageId },
      data: updateData,
    });

    if (approve && updatedMarriage.spouse1ConsentGranted && updatedMarriage.spouse2ConsentGranted) {
      return this.prisma.marriage.update({
        where: { id: marriageId },
        data: { status: 'PENDING_REVIEW' },
      });
    }

    if (!approve) {
      return this.prisma.marriage.update({
        where: { id: marriageId },
        data: { status: 'CANCELLED' },
      });
    }

    return updatedMarriage;
  }

  async fileDivorce(userId: string, data: {
    marriageId: string;
    reason: string;
    propertyDivision?: string;
  }) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: data.marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'REGISTERED') {
      throw new BadRequestException('Can only divorce registered marriages');
    }
    if (marriage.spouse1Id !== userId && marriage.spouse2Id !== userId) {
      throw new ForbiddenException('You are not a party to this marriage');
    }

    return this.prisma.zagsDivorce.create({
      data: {
        marriageId: data.marriageId,
        initiatedById: userId,
        reason: data.reason,
        propertyDivision: data.propertyDivision,
        status: 'FILED',
      },
    });
  }

  async getCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });
    if (!marriage) throw new NotFoundException('Certificate not found');
    return marriage;
  }

  async verifyCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });

    if (!marriage) {
      return { isValid: false, certificateNumber, type: 'MARRIAGE' };
    }

    return {
      isValid: marriage.status === 'REGISTERED',
      certificateNumber,
      type: 'MARRIAGE',
      issuedDate: marriage.registeredAt,
      details: {
        spouse1Name: marriage.spouse1FullName,
        spouse2Name: marriage.spouse2FullName,
        marriageDate: marriage.marriageDate,
      },
    };
  }

  // Officer functions
  async getAllMarriages() {
    return this.prisma.marriage.findMany({
      include: { consents: true, divorces: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingMarriages() {
    return this.prisma.marriage.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { consents: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveMarriage(marriageId: string, certificateNumber?: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Marriage not in reviewable state');
    }

    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: {
        status: 'APPROVED',
        ...(certificateNumber ? { certificateNumber } : {}),
      },
    });
  }

  async rejectMarriage(marriageId: string, notes: string) {
    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: { status: 'REJECTED' },
    });
  }

  async registerMarriage(marriageId: string, officerId: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'APPROVED') {
      throw new BadRequestException('Marriage must be approved first');
    }

    const now = new Date();

    // Create family bank account for joint finances
    const familyAccountNumber = `FAM-${marriageId.substring(0, 8).toUpperCase()}-001`;
    const familyAccount = await this.prisma.orgBankAccount.create({
      data: {
        accountName: `Семейный счёт — ${marriage.spouse1FullName} & ${marriage.spouse2FullName}`,
        accountNumber: familyAccountNumber,
        accountType: 'FAMILY',
        balance: 0,
        currency: 'ALTAN',
        // No organizationId — family accounts are standalone
      },
    });

    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: {
        status: 'REGISTERED',
        registeredBy: officerId,
        registeredAt: now,
        jointPropertyStartDate: now,
        familyAccountId: familyAccount.id,
      },
    });
  }

  async finalizeDivorce(divorceId: string, officerId: string) {
    const divorce = await this.prisma.zagsDivorce.findUnique({
      where: { id: divorceId },
      include: { marriage: true },
    });
    if (!divorce) throw new NotFoundException('Divorce not found');
    if (divorce.status !== 'FILED' && divorce.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Divorce not in reviewable state');
    }

    // Finalize divorce and update marriage status
    const [updatedDivorce] = await this.prisma.$transaction([
      this.prisma.zagsDivorce.update({
        where: { id: divorceId },
        data: {
          status: 'FINALIZED',
          finalizedDate: new Date(),
          finalizedById: officerId,
        },
      }),
      this.prisma.marriage.update({
        where: { id: divorce.marriageId },
        data: { status: 'DIVORCED' },
      }),
    ]);

    return updatedDivorce;
  }

  // ===========================================================================
  // CIVIL UNIONS
  // ===========================================================================

  /**
   * Create a civil union application (same flow as marriage, unionType = CIVIL_UNION).
   */
  async createCivilUnion(userId: string, data: {
    partnerId: string;
    spouse1FullName: string;
    spouse2FullName: string;
    spouse1DateOfBirth: string;
    spouse2DateOfBirth: string;
    unionDate: string;
    propertyRegime?: 'SEPARATE' | 'JOINT' | 'CUSTOM';
    propertyAgreement?: string;
  }) {
    // Verify eligibility for both partners
    const [elig1, elig2] = await Promise.all([
      this.checkEligibility(userId),
      this.checkEligibility(data.partnerId),
    ]);

    if (!elig1.isEligible) {
      throw new BadRequestException(`Initiator not eligible: ${elig1.reasons.join(', ')}`);
    }
    if (!elig2.isEligible) {
      throw new BadRequestException(`Partner not eligible: ${elig2.reasons.join(', ')}`);
    }

    const union = await this.prisma.marriage.create({
      data: {
        spouse1Id: userId,
        spouse2Id: data.partnerId,
        spouse1FullName: data.spouse1FullName,
        spouse2FullName: data.spouse2FullName,
        spouse1DateOfBirth: new Date(data.spouse1DateOfBirth),
        spouse2DateOfBirth: new Date(data.spouse2DateOfBirth),
        marriageDate: new Date(data.unionDate),
        unionType: 'CIVIL_UNION',
        propertyRegime: data.propertyRegime,
        propertyAgreement: data.propertyAgreement,
        status: 'PENDING_CONSENT',
        spouse1ConsentGranted: true,
        spouse1ConsentedAt: new Date(),
      },
    });

    // Create consent records
    await this.prisma.marriageConsent.createMany({
      data: [
        { marriageId: union.id, userId, status: 'APPROVED', consentedAt: new Date() },
        { marriageId: union.id, userId: data.partnerId, status: 'PENDING' },
      ],
    });

    return union;
  }

  // ===========================================================================
  // WEDDING GIFTS
  // ===========================================================================

  /**
   * Record a wedding gift (who gave what to whom).
   */
  async recordWeddingGift(
    marriageId: string,
    data: {
      giverId: string;
      giverName: string;
      recipientId: string;
      description: string;
      estimatedValue?: number;
      category?: string;
    },
  ) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');

    // Verify recipient is one of the spouses
    if (data.recipientId !== marriage.spouse1Id && data.recipientId !== marriage.spouse2Id) {
      throw new BadRequestException('Recipient must be one of the spouses');
    }

    return this.prisma.weddingGift.create({
      data: {
        marriageId,
        giverId: data.giverId,
        giverName: data.giverName,
        recipientId: data.recipientId,
        description: data.description,
        estimatedValue: data.estimatedValue,
        category: data.category,
      },
    });
  }

  /**
   * Get all gifts for a marriage.
   */
  async getWeddingGifts(marriageId: string) {
    return this.prisma.weddingGift.findMany({
      where: { marriageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Officer dashboard statistics.
   */
  async getOfficerStats() {
    const [
      totalMarriages,
      pendingMarriages,
      totalDivorces,
      recentMarriages,
    ] = await Promise.all([
      this.prisma.marriage.count(),
      this.prisma.marriage.count({
        where: { status: { in: ['PENDING_CONSENT', 'PENDING_REVIEW'] } },
      }),
      this.prisma.marriage.count({
        where: { status: 'DIVORCED' },
      }),
      this.prisma.marriage.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          spouse1: { select: { id: true, seatId: true, username: true } },
          spouse2: { select: { id: true, seatId: true, username: true } },
        },
      }),
    ]);

    return {
      totalMarriages,
      pendingMarriages,
      totalDivorces,
      activeMarriages: totalMarriages - totalDivorces,
      recentMarriages,
    };
  }

  // ============ DEATH REGISTRATION ============

  /**
   * Register a death. Reporter cannot be the deceased.
   */
  async registerDeath(reporterId: string, data: {
    deceasedId: string;
    deceasedFullName: string;
    dateOfBirth: string;
    dateOfDeath: string;
    placeOfDeath: string;
    causeOfDeath: string;
    reportedByName: string;
    relationship: string;
    medicalCertificateNumber?: string;
    doctorName?: string;
    hospitalName?: string;
    burialLocation?: string;
    burialDate?: string;
  }) {
    if (reporterId === data.deceasedId) {
      throw new BadRequestException('Cannot register your own death');
    }

    // Verify deceased user exists
    const deceased = await this.prisma.user.findUnique({
      where: { id: data.deceasedId },
      select: { id: true },
    });
    if (!deceased) {
      throw new NotFoundException('Deceased user not found');
    }

    return this.prisma.deathRegistration.create({
      data: {
        deceasedId: data.deceasedId,
        deceasedFullName: data.deceasedFullName,
        dateOfBirth: new Date(data.dateOfBirth),
        dateOfDeath: new Date(data.dateOfDeath),
        placeOfDeath: data.placeOfDeath,
        causeOfDeath: data.causeOfDeath,
        reportedById: reporterId,
        reportedByName: data.reportedByName,
        relationship: data.relationship,
        medicalCertificateNumber: data.medicalCertificateNumber,
        doctorName: data.doctorName,
        hospitalName: data.hospitalName,
        burialLocation: data.burialLocation,
        burialDate: data.burialDate ? new Date(data.burialDate) : undefined,
      },
    });
  }

  /** Get a death registration by ID. */
  async getDeathRegistration(id: string) {
    const reg = await this.prisma.deathRegistration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Death registration not found');
    return reg;
  }

  /** Officer: get pending death registrations. */
  async getPendingDeaths() {
    return this.prisma.deathRegistration.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Officer: approve and register a death, update deceased user status. */
  async approveDeathRegistration(id: string, officerId: string) {
    const reg = await this.prisma.deathRegistration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Death registration not found');
    if (reg.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve registration with status ${reg.status}`);
    }

    // Update registration + mark user as DECEASED
    const [updated] = await this.prisma.$transaction([
      this.prisma.deathRegistration.update({
        where: { id },
        data: {
          status: 'REGISTERED',
          registeredById: officerId,
          registeredAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: reg.deceasedId },
        data: {
          verificationStatus: 'DECEASED' as any,
        },
      }),
    ]);

    return updated;
  }

  /** Officer: reject a death registration. */
  async rejectDeathRegistration(id: string, notes: string) {
    const reg = await this.prisma.deathRegistration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Death registration not found');
    if (reg.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject registration with status ${reg.status}`);
    }

    return this.prisma.deathRegistration.update({
      where: { id },
      data: { status: 'REJECTED', notes },
    });
  }

  /** Get a death certificate by certificate number. */
  async getDeathCertificate(certificateNumber: string) {
    const reg = await this.prisma.deathRegistration.findUnique({
      where: { certificateNumber },
    });
    if (!reg) throw new NotFoundException('Death certificate not found');
    return reg;
  }

  // ============ NAME CHANGE ============

  /** Apply for a legal name change. */
  async applyNameChange(userId: string, data: {
    previousName: string;
    newName: string;
    reason: string;
    supportingDocumentIds?: string[];
  }) {
    if (data.previousName === data.newName) {
      throw new BadRequestException('New name must differ from current name');
    }

    return this.prisma.nameChange.create({
      data: {
        userId,
        previousName: data.previousName,
        newName: data.newName,
        reason: data.reason,
        supportingDocumentIds: data.supportingDocumentIds ?? [],
      },
    });
  }

  /** Get user's own name change history. */
  async getMyNameChanges(userId: string) {
    return this.prisma.nameChange.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Officer: get pending name change applications. */
  async getPendingNameChanges() {
    return this.prisma.nameChange.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Officer: approve a name change and update the user's display name. */
  async approveNameChange(id: string, officerId: string) {
    const nc = await this.prisma.nameChange.findUnique({ where: { id } });
    if (!nc) throw new NotFoundException('Name change application not found');
    if (nc.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve application with status ${nc.status}`);
    }

    const now = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.nameChange.update({
        where: { id },
        data: {
          status: 'REGISTERED',
          approvedById: officerId,
          approvedAt: now,
          effectiveDate: now,
        },
      }),
      this.prisma.user.update({
        where: { id: nc.userId },
        data: { username: nc.newName },
      }),
    ]);

    return updated;
  }

  /** Officer: reject a name change application. */
  async rejectNameChange(id: string, notes: string) {
    const nc = await this.prisma.nameChange.findUnique({ where: { id } });
    if (!nc) throw new NotFoundException('Name change application not found');
    if (nc.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject application with status ${nc.status}`);
    }

    return this.prisma.nameChange.update({
      where: { id },
      data: { status: 'REJECTED', notes },
    });
  }

  // ============ Public Registry Search ============

  /**
   * Search public registry for registered civil records.
   * Returns only APPROVED/REGISTERED records for privacy.
   */
  async searchPublicRegistry(query: {
    name?: string;
    certificateNumber?: string;
    dateFrom?: string;
    dateTo?: string;
    type?: 'MARRIAGE' | 'DEATH' | 'NAME_CHANGE' | 'ALL';
  }) {
    const type = query.type || 'ALL';
    const results: any = {};

    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

    if (type === 'ALL' || type === 'MARRIAGE') {
      const marriageWhere: any = { status: 'REGISTERED' };
      if (query.name) {
        marriageWhere.OR = [
          { spouse1FullName: { contains: query.name, mode: 'insensitive' } },
          { spouse2FullName: { contains: query.name, mode: 'insensitive' } },
        ];
      }
      if (query.certificateNumber) {
        marriageWhere.certificateNumber = query.certificateNumber;
      }
      if (query.dateFrom || query.dateTo) {
        marriageWhere.marriageDate = dateFilter;
      }
      results.marriages = await this.prisma.marriage.findMany({
        where: marriageWhere,
        select: {
          id: true, certificateNumber: true, spouse1FullName: true, spouse2FullName: true,
          marriageDate: true, ceremonyLocation: true, status: true,
        },
        take: 50,
        orderBy: { marriageDate: 'desc' },
      });
    }

    if (type === 'ALL' || type === 'DEATH') {
      const deathWhere: any = { status: 'APPROVED' };
      if (query.name) {
        deathWhere.deceasedFullName = { contains: query.name, mode: 'insensitive' };
      }
      if (query.certificateNumber) {
        deathWhere.certificateNumber = query.certificateNumber;
      }
      if (query.dateFrom || query.dateTo) {
        deathWhere.dateOfDeath = dateFilter;
      }
      results.deaths = await this.prisma.deathRegistration.findMany({
        where: deathWhere,
        select: {
          id: true, certificateNumber: true, deceasedFullName: true,
          dateOfDeath: true, placeOfDeath: true, status: true,
        },
        take: 50,
        orderBy: { dateOfDeath: 'desc' },
      });
    }

    if (type === 'ALL' || type === 'NAME_CHANGE') {
      const changeWhere: any = { status: 'APPROVED' };
      if (query.name) {
        changeWhere.OR = [
          { previousName: { contains: query.name, mode: 'insensitive' } },
          { newName: { contains: query.name, mode: 'insensitive' } },
        ];
      }
      if (query.dateFrom || query.dateTo) {
        changeWhere.createdAt = dateFilter;
      }
      results.nameChanges = await this.prisma.nameChange.findMany({
        where: changeWhere,
        select: {
          id: true, previousName: true, newName: true,
          reason: true, status: true, createdAt: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    }

    return results;
  }
}


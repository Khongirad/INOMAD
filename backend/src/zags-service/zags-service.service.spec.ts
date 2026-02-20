import { Test, TestingModule } from '@nestjs/testing';
import { ZagsServiceService } from './zags-service.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ZagsServiceService', () => {
  let service: ZagsServiceService;
  let prisma: any;

  const mockMarriage = {
    id: 'mar-1', spouse1Id: 'user-1', spouse2Id: 'user-2',
    spouse1FullName: 'Alice', spouse2FullName: 'Bob',
    spouse1DateOfBirth: new Date('1990-01-01'), spouse2DateOfBirth: new Date('1992-05-15'),
    marriageDate: new Date('2024-06-15'), status: 'REGISTERED',
    certificateNumber: 'CERT-001', registeredAt: new Date(),
    spouse1ConsentGranted: true, spouse2ConsentGranted: true,
    spouse1ConsentedAt: new Date(), spouse2ConsentedAt: new Date(),
    unionType: 'MARRIAGE', propertyRegime: 'JOINT',
    consents: [], divorces: [],
  };

  const mockDivorce = {
    id: 'div-1', marriageId: 'mar-1', initiatedById: 'user-1',
    reason: 'Incompatible', status: 'FILED', marriage: mockMarriage,
  };

  const baseMock = (val: any = null) => ({
    findUnique: jest.fn().mockResolvedValue(val),
    findFirst: jest.fn().mockResolvedValue(val),
    findMany: jest.fn().mockResolvedValue(val ? [val] : []),
    create: jest.fn().mockResolvedValue(val),
    createMany: jest.fn().mockResolvedValue({ count: 2 }),
    update: jest.fn().mockResolvedValue(val),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(5),
  });

  // Verified adult citizen — passes all ZAGS eligibility guards
  const mockAdultUser = { id: 'user-1', dateOfBirth: new Date('1990-01-01'), isVerified: true, isLegalSubject: true };

  beforeEach(async () => {
    prisma = {
      user: baseMock(mockAdultUser),
      marriage: baseMock(mockMarriage),
      marriageConsent: baseMock({ id: 'consent-1', userId: 'user-2', status: 'PENDING', marriage: mockMarriage }),
      zagsDivorce: baseMock(mockDivorce),
      orgBankAccount: baseMock({ id: 'acc-1', accountName: 'Family Account' }),
      weddingGift: baseMock({ id: 'gift-1', description: 'Silver set' }),
      deathRegistration: baseMock({ id: 'death-1', deceasedId: 'user-2', reportedById: 'user-1', status: 'PENDING', certificateNumber: 'DEATH-CERT-001', deceasedFullName: 'Bob', dateOfBirth: new Date('1992-05-15'), dateOfDeath: new Date('2025-01-01'), placeOfDeath: 'Hospital', causeOfDeath: 'Natural', reportedByName: 'Alice', relationship: 'SPOUSE' }),
      nameChange: baseMock({ id: 'nc-1', userId: 'user-1', previousName: 'Alice Smith', newName: 'Alice Johnson', reason: 'MARRIAGE', status: 'PENDING', supportingDocumentIds: [], certificateNumber: 'NC-CERT-001' }),
      $transaction: jest.fn((arg) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.all(arg);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZagsServiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ZagsServiceService>(ZagsServiceService);
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  // ── ELIGIBILITY ──

  describe('checkEligibility', () => {
    it('should return eligible for single adult user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(null);
      const result = await service.checkEligibility('user-3');
      expect(result.isEligible).toBe(true);
      expect(result.currentStatus).toBe('SINGLE');
    });

    it('should return ineligible for married user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(mockMarriage);
      prisma.zagsDivorce.findFirst.mockResolvedValue(null);
      const result = await service.checkEligibility('user-1');
      expect(result.isEligible).toBe(false);
      expect(result.currentStatus).toBe('MARRIED');
      expect(result.reasons).toContain('Already married');
    });

    it('should note pending divorce', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(mockMarriage);
      prisma.zagsDivorce.findFirst.mockResolvedValue(mockDivorce);
      const result = await service.checkEligibility('user-1');
      expect(result.reasons).toContain('Divorce proceedings in progress');
    });

    it('should return ineligible for underage user', async () => {
      // Minor with no verification — both legal + age reasons will appear
      prisma.user.findUnique.mockResolvedValue({ id: 'minor', dateOfBirth: new Date('2015-01-01'), isVerified: false, isLegalSubject: false });
      prisma.marriage.findFirst.mockResolvedValue(null);
      const result = await service.checkEligibility('minor');
      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('Must be at least 18'))).toBe(true);
    });

    it('should return ineligible if no date of birth on file', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'no-dob', dateOfBirth: null, isVerified: true, isLegalSubject: true });
      prisma.marriage.findFirst.mockResolvedValue(null);
      const result = await service.checkEligibility('no-dob');
      expect(result.isEligible).toBe(false);
      expect(result.reasons).toContain('Date of birth not on file — update your profile first');
    });
  });

  // ── MARRIAGE APPLICATION ──

  describe('createMarriageApplication', () => {
    it('should create a marriage application when both eligible', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(null); // both single
      prisma.marriage.create.mockResolvedValue({ ...mockMarriage, status: 'PENDING_CONSENT' });
      const result = await service.createMarriageApplication('user-1', {
        partnerId: 'user-2', spouse1FullName: 'Alice', spouse2FullName: 'Bob',
        spouse1DateOfBirth: '1990-01-01', spouse2DateOfBirth: '1992-05-15',
        marriageDate: '2024-06-15',
      });
      expect(result).toBeDefined();
      expect(prisma.marriageConsent.createMany).toHaveBeenCalled();
    });

    it('should accept all optional fields', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(null);
      prisma.marriage.create.mockResolvedValue({ ...mockMarriage, status: 'PENDING_CONSENT' });
      const result = await service.createMarriageApplication('user-1', {
        partnerId: 'user-2', spouse1FullName: 'Alice', spouse2FullName: 'Bob',
        spouse1DateOfBirth: '1990-01-01', spouse2DateOfBirth: '1992-05-15',
        marriageDate: '2024-06-15', ceremonyType: 'Civil', ceremonyLocation: 'City Hall',
        witness1Name: 'Charlie', witness2Name: 'Dave', propertyRegime: 'JOINT',
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when marrying yourself', async () => {
      await expect(service.createMarriageApplication('user-1', {
        partnerId: 'user-1', spouse1FullName: 'A', spouse2FullName: 'A',
        spouse1DateOfBirth: '1990-01-01', spouse2DateOfBirth: '1990-01-01',
        marriageDate: '2024-06-15',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ── QUERIES ──

  describe('getMyMarriages', () => {
    it('should return user marriages', async () => {
      const result = await service.getMyMarriages('user-1');
      expect(result).toBeDefined();
    });
  });

  describe('getMarriage', () => {
    it('should return marriage by id', async () => {
      const result = await service.getMarriage('mar-1');
      expect(result.id).toBe('mar-1');
    });
    it('should throw NotFoundException', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.getMarriage('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingConsents', () => {
    it('should return pending consents', async () => {
      const result = await service.getPendingConsents('user-2');
      expect(result).toBeDefined();
    });
  });

  // ── CONSENT ──

  describe('grantConsent', () => {
    it('should approve consent and move to PENDING_REVIEW', async () => {
      prisma.marriage.findUnique.mockResolvedValue({
        ...mockMarriage, status: 'PENDING_CONSENT', spouse2ConsentGranted: false,
        consents: [{ userId: 'user-1', status: 'APPROVED' }, { userId: 'user-2', status: 'PENDING' }],
      });
      prisma.marriage.update.mockResolvedValue({
        ...mockMarriage, spouse2ConsentGranted: true, spouse2ConsentedAt: new Date(),
      });
      const result = await service.grantConsent('user-2', 'mar-1', true);
      expect(prisma.marriageConsent.updateMany).toHaveBeenCalled();
    });

    it('should cancel marriage on rejection', async () => {
      prisma.marriage.findUnique.mockResolvedValue({
        ...mockMarriage, status: 'PENDING_CONSENT', spouse2ConsentGranted: false,
      });
      prisma.marriage.update
        .mockResolvedValueOnce({ ...mockMarriage, spouse2ConsentGranted: false }) // first update
        .mockResolvedValueOnce({ ...mockMarriage, status: 'CANCELLED' }); // cancel
      const result = await service.grantConsent('user-2', 'mar-1', false);
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException for unknown marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.grantConsent('user-2', 'bad', true)).rejects.toThrow(NotFoundException);
    });
  });

  // ── DIVORCE ──

  describe('fileDivorce', () => {
    it('should file a divorce', async () => {
      prisma.zagsDivorce.create.mockResolvedValue(mockDivorce);
      const result = await service.fileDivorce('user-1', {
        marriageId: 'mar-1', reason: 'Incompatible',
      });
      expect(result.status).toBe('FILED');
    });

    it('should throw NotFoundException for unknown marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.fileDivorce('user-1', { marriageId: 'bad', reason: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-registered marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'PENDING_CONSENT' });
      await expect(service.fileDivorce('user-1', { marriageId: 'mar-1', reason: 'X' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-party', async () => {
      await expect(service.fileDivorce('user-3', { marriageId: 'mar-1', reason: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ── CERTIFICATES ──

  describe('getCertificate', () => {
    it('should return certificate', async () => {
      const result = await service.getCertificate('CERT-001');
      expect(result).toBeDefined();
    });
    it('should throw NotFoundException', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.getCertificate('BAD')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyCertificate', () => {
    it('should verify valid certificate', async () => {
      const result = await service.verifyCertificate('CERT-001');
      expect(result.isValid).toBe(true);
    });
    it('should return invalid for unknown certificate', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      const result = await service.verifyCertificate('BAD');
      expect(result.isValid).toBe(false);
    });
    it('should return invalid for divorced marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'DIVORCED' });
      const result = await service.verifyCertificate('CERT-001');
      expect(result.isValid).toBe(false);
    });
  });

  // ── OFFICER FUNCTIONS ──

  describe('getAllMarriages', () => {
    it('should return all marriages', async () => {
      const result = await service.getAllMarriages();
      expect(result).toBeDefined();
    });
  });

  describe('getPendingMarriages', () => {
    it('should return pending marriages', async () => {
      const result = await service.getPendingMarriages();
      expect(result).toBeDefined();
    });
  });

  describe('approveMarriage', () => {
    it('should approve a marriage in PENDING_REVIEW', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'PENDING_REVIEW' });
      prisma.marriage.update.mockResolvedValue({ ...mockMarriage, status: 'APPROVED' });
      const result = await service.approveMarriage('mar-1', 'CERT-002');
      expect(result.status).toBe('APPROVED');
    });
    it('should throw NotFoundException', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.approveMarriage('bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException for wrong state', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'REGISTERED' });
      await expect(service.approveMarriage('mar-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectMarriage', () => {
    it('should reject a marriage', async () => {
      prisma.marriage.update.mockResolvedValue({ ...mockMarriage, status: 'REJECTED' });
      const result = await service.rejectMarriage('mar-1', 'Missing docs');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('registerMarriage', () => {
    it('should register an approved marriage and create family account', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'APPROVED' });
      prisma.orgBankAccount.create.mockResolvedValue({ id: 'fam-acc' });
      prisma.marriage.update.mockResolvedValue({ ...mockMarriage, status: 'REGISTERED' });
      const result = await service.registerMarriage('mar-1', 'officer-1');
      expect(prisma.orgBankAccount.create).toHaveBeenCalled();
      expect(result.status).toBe('REGISTERED');
    });
    it('should throw NotFoundException', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.registerMarriage('bad', 'off-1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException for non-approved marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue({ ...mockMarriage, status: 'PENDING_REVIEW' });
      await expect(service.registerMarriage('mar-1', 'off-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalizeDivorce', () => {
    it('should finalize a divorce', async () => {
      prisma.zagsDivorce.findUnique.mockResolvedValue(mockDivorce);
      prisma.zagsDivorce.update.mockResolvedValue({ ...mockDivorce, status: 'FINALIZED' });
      const result = await service.finalizeDivorce('div-1', 'officer-1');
      expect(result.status).toBe('FINALIZED');
    });
    it('should throw NotFoundException', async () => {
      prisma.zagsDivorce.findUnique.mockResolvedValue(null);
      await expect(service.finalizeDivorce('bad', 'off-1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException for wrong state', async () => {
      prisma.zagsDivorce.findUnique.mockResolvedValue({ ...mockDivorce, status: 'FINALIZED' });
      await expect(service.finalizeDivorce('div-1', 'off-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── CIVIL UNION ──

  describe('createCivilUnion', () => {
    it('should create a civil union when both eligible', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(null); // both eligible
      prisma.marriage.create.mockResolvedValue({ ...mockMarriage, status: 'PENDING_CONSENT' });
      const result = await service.createCivilUnion('user-3', {
        partnerId: 'user-4', spouse1FullName: 'Eve', spouse2FullName: 'Frank',
        spouse1DateOfBirth: '1991-03-01', spouse2DateOfBirth: '1993-07-10',
        unionDate: '2024-09-01',
      });
      expect(result.status).toBe('PENDING_CONSENT');
    });
    it('should throw BadRequestException if initiator not eligible', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdultUser);
      prisma.marriage.findFirst.mockResolvedValue(mockMarriage); // married = ineligible
      prisma.zagsDivorce.findFirst.mockResolvedValue(null);
      await expect(service.createCivilUnion('user-1', {
        partnerId: 'user-3', spouse1FullName: 'A', spouse2FullName: 'B',
        spouse1DateOfBirth: '1990-01-01', spouse2DateOfBirth: '1992-01-01',
        unionDate: '2024-09-01',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ── WEDDING GIFTS ──

  describe('recordWeddingGift', () => {
    it('should record a gift', async () => {
      prisma.weddingGift.create.mockResolvedValue({ id: 'gift-2', description: 'China set' });
      const result = await service.recordWeddingGift('mar-1', {
        giverId: 'user-3', giverName: 'Charlie', recipientId: 'user-1',
        description: 'China set', estimatedValue: 500,
      });
      expect(result).toBeDefined();
    });
    it('should throw NotFoundException for unknown marriage', async () => {
      prisma.marriage.findUnique.mockResolvedValue(null);
      await expect(service.recordWeddingGift('bad', {
        giverId: 'x', giverName: 'x', recipientId: 'x', description: 'x',
      })).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if recipient is not a spouse', async () => {
      await expect(service.recordWeddingGift('mar-1', {
        giverId: 'user-3', giverName: 'Charlie', recipientId: 'user-99',
        description: 'Gold watch',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWeddingGifts', () => {
    it('should return gifts for marriage', async () => {
      const result = await service.getWeddingGifts('mar-1');
      expect(result).toBeDefined();
    });
  });

  // ── OFFICER STATS ──

  describe('getOfficerStats', () => {
    it('should return officer dashboard stats', async () => {
      prisma.marriage.count
        .mockResolvedValueOnce(10)  // totalMarriages
        .mockResolvedValueOnce(2)   // pendingMarriages
        .mockResolvedValueOnce(1);  // totalDivorces
      prisma.marriage.findMany.mockResolvedValue([mockMarriage]);
      const result = await service.getOfficerStats();
      expect(result.totalMarriages).toBe(10);
      expect(result.pendingMarriages).toBe(2);
      expect(result.totalDivorces).toBe(1);
      expect(result.activeMarriages).toBe(9);
    });
  });

  // ── DEATH REGISTRATION ──

  describe('registerDeath', () => {
    it('should create a death registration', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.deathRegistration.create.mockResolvedValue({ id: 'death-new', status: 'PENDING' });
      const result = await service.registerDeath('user-1', {
        deceasedId: 'user-2',
        deceasedFullName: 'Bob',
        dateOfBirth: '1992-05-15',
        dateOfDeath: '2025-01-01',
        placeOfDeath: 'Hospital',
        causeOfDeath: 'Natural',
        reportedByName: 'Alice',
        relationship: 'SPOUSE',
      });
      expect(result).toBeDefined();
      expect(prisma.deathRegistration.create).toHaveBeenCalled();
    });

    it('should reject self-death registration', async () => {
      await expect(service.registerDeath('user-1', {
        deceasedId: 'user-1',
        deceasedFullName: 'Alice',
        dateOfBirth: '1990-01-01',
        dateOfDeath: '2025-01-01',
        placeOfDeath: 'Hospital',
        causeOfDeath: 'Natural',
        reportedByName: 'Alice',
        relationship: 'SELF',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject if deceased user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.registerDeath('user-1', {
        deceasedId: 'nonexistent',
        deceasedFullName: 'Ghost',
        dateOfBirth: '1990-01-01',
        dateOfDeath: '2025-01-01',
        placeOfDeath: 'Unknown',
        causeOfDeath: 'Unknown',
        reportedByName: 'Alice',
        relationship: 'OTHER',
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeathRegistration', () => {
    it('should return death registration by ID', async () => {
      const result = await service.getDeathRegistration('death-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('death-1');
    });

    it('should throw if not found', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue(null);
      await expect(service.getDeathRegistration('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveDeathRegistration', () => {
    it('should approve and set status REGISTERED', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue({ id: 'death-1', status: 'PENDING', deceasedId: 'user-2' });
      prisma.deathRegistration.update.mockResolvedValue({ id: 'death-1', status: 'REGISTERED' });
      prisma.user.update.mockResolvedValue({ id: 'user-2' });
      const result = await service.approveDeathRegistration('death-1', 'officer-1');
      expect(result).toBeDefined();
    });

    it('should reject if not PENDING', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue({ id: 'death-1', status: 'REGISTERED' });
      await expect(service.approveDeathRegistration('death-1', 'officer-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectDeathRegistration', () => {
    it('should reject and set notes', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue({ id: 'death-1', status: 'PENDING' });
      prisma.deathRegistration.update.mockResolvedValue({ id: 'death-1', status: 'REJECTED', notes: 'Insufficient evidence' });
      const result = await service.rejectDeathRegistration('death-1', 'Insufficient evidence');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('getDeathCertificate', () => {
    it('should return by certificate number', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue({ certificateNumber: 'DEATH-CERT-001' });
      const result = await service.getDeathCertificate('DEATH-CERT-001');
      expect(result.certificateNumber).toBe('DEATH-CERT-001');
    });

    it('should throw if cert not found', async () => {
      prisma.deathRegistration.findUnique.mockResolvedValue(null);
      await expect(service.getDeathCertificate('FAKE')).rejects.toThrow(NotFoundException);
    });
  });

  // ── NAME CHANGE ──

  describe('applyNameChange', () => {
    it('should create a name change application', async () => {
      prisma.nameChange.create.mockResolvedValue({ id: 'nc-new', status: 'PENDING' });
      const result = await service.applyNameChange('user-1', {
        previousName: 'Alice Smith',
        newName: 'Alice Johnson',
        reason: 'MARRIAGE',
      });
      expect(result).toBeDefined();
      expect(prisma.nameChange.create).toHaveBeenCalled();
    });

    it('should reject if same name', async () => {
      await expect(service.applyNameChange('user-1', {
        previousName: 'Alice',
        newName: 'Alice',
        reason: 'PERSONAL',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyNameChanges', () => {
    it('should return user name changes', async () => {
      const result = await service.getMyNameChanges('user-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('approveNameChange', () => {
    it('should approve and update username', async () => {
      prisma.nameChange.findUnique.mockResolvedValue({ id: 'nc-1', status: 'PENDING', userId: 'user-1', newName: 'Alice Johnson' });
      prisma.nameChange.update.mockResolvedValue({ id: 'nc-1', status: 'REGISTERED' });
      prisma.user.update.mockResolvedValue({ id: 'user-1', username: 'Alice Johnson' });
      const result = await service.approveNameChange('nc-1', 'officer-1');
      expect(result).toBeDefined();
    });

    it('should reject if not PENDING', async () => {
      prisma.nameChange.findUnique.mockResolvedValue({ id: 'nc-1', status: 'REGISTERED' });
      await expect(service.approveNameChange('nc-1', 'officer-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectNameChange', () => {
    it('should reject with notes', async () => {
      prisma.nameChange.findUnique.mockResolvedValue({ id: 'nc-1', status: 'PENDING' });
      prisma.nameChange.update.mockResolvedValue({ id: 'nc-1', status: 'REJECTED', notes: 'Docs incomplete' });
      const result = await service.rejectNameChange('nc-1', 'Docs incomplete');
      expect(result.status).toBe('REJECTED');
    });
  });
});

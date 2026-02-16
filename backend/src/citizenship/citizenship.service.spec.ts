import { Test, TestingModule } from '@nestjs/testing';
import { CitizenshipService } from './citizenship.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CitizenshipService', () => {
  let service: CitizenshipService;
  let prisma: any;

  const mockPrisma = () => ({
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    exclusiveRightTransfer: { create: jest.fn(), findMany: jest.fn() },
    citizenshipAdmission: {
      create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), update: jest.fn(),
    },
    citizenshipAdmissionVote: { create: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn().mockImplementation((arg) =>
      typeof arg === 'function' ? arg(prisma) : Promise.resolve(arg),
    ),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenshipService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(CitizenshipService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── grantInitialRight ─────────────────
  describe('grantInitialRight', () => {
    it('should grant initial right to male', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', gender: 'MALE', hasExclusiveLandRight: false });
      prisma.user.update.mockResolvedValue({});
      prisma.exclusiveRightTransfer.create.mockResolvedValue({});
      const result = await service.grantInitialRight('u1', 'admin');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.grantInitialRight('bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for female', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', gender: 'FEMALE', hasExclusiveLandRight: false });
      await expect(service.grantInitialRight('u1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already holds right', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', gender: 'MALE', hasExclusiveLandRight: true });
      await expect(service.grantInitialRight('u1', 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── inheritRight ──────────────────────
  describe('inheritRight', () => {
    it('should inherit right from father to son', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'father', hasExclusiveLandRight: true })
        .mockResolvedValueOnce({ id: 'son', gender: 'MALE', fatherId: 'father' });
      prisma.user.update.mockResolvedValue({});
      prisma.exclusiveRightTransfer.create.mockResolvedValue({});
      const result = await service.inheritRight('father', 'son');
      expect(result.success).toBe(true);
    });

    it('should throw for female son', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'father', hasExclusiveLandRight: true })
        .mockResolvedValueOnce({ id: 'daughter', gender: 'FEMALE', fatherId: 'father' });
      await expect(service.inheritRight('father', 'daughter')).rejects.toThrow(BadRequestException);
    });

    it('should throw if father has no right', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'father', hasExclusiveLandRight: false })
        .mockResolvedValueOnce({ id: 'son', gender: 'MALE', fatherId: 'father' });
      await expect(service.inheritRight('father', 'son')).rejects.toThrow(BadRequestException);
    });

    it('should throw if son is not child of father', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'father', hasExclusiveLandRight: true })
        .mockResolvedValueOnce({ id: 'son', gender: 'MALE', fatherId: 'other' });
      await expect(service.inheritRight('father', 'son')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── revertToFund ──────────────────────
  describe('revertToFund', () => {
    it('should revert when no male heirs', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', hasExclusiveLandRight: true,
        children: [{ gender: 'FEMALE' }],
      });
      prisma.user.update.mockResolvedValue({});
      prisma.exclusiveRightTransfer.create.mockResolvedValue({});
      const result = await service.revertToFund('u1', 'No heir');
      expect(result.success).toBe(true);
    });

    it('should throw if male heirs exist', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', hasExclusiveLandRight: true,
        children: [{ gender: 'MALE' }],
      });
      await expect(service.revertToFund('u1', 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── delegateKhuralSeat ────────────────
  describe('delegateKhuralSeat', () => {
    it('should delegate Khural seat to spouse', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', hasExclusiveLandRight: true });
      prisma.user.update.mockResolvedValue({});
      const result = await service.delegateKhuralSeat('h1', 'spouse-1');
      expect(result.delegatedTo).toBe('spouse-1');
    });

    it('should throw ForbiddenException for non-holder', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', hasExclusiveLandRight: false });
      await expect(service.delegateKhuralSeat('h1', 'spouse-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── applyForCitizenship ───────────────
  describe('applyForCitizenship', () => {
    it('should create application for RESIDENT', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'RESIDENT' });
      prisma.citizenshipAdmission.findFirst.mockResolvedValue(null);
      prisma.citizenshipAdmission.create.mockResolvedValue({ id: 'adm-1', status: 'PENDING' });
      const result = await service.applyForCitizenship('u1');
      expect(result.status).toBe('PENDING');
    });

    it('should throw for non-RESIDENT', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'CITIZEN' });
      await expect(service.applyForCitizenship('u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw for existing pending application', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'RESIDENT' });
      prisma.citizenshipAdmission.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.applyForCitizenship('u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── voteOnAdmission ──────────────────
  describe('voteOnAdmission', () => {
    it('should allow INDIGENOUS to vote FOR', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'PENDING', quorum: 5 });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'INDIGENOUS' });
      prisma.citizenshipAdmissionVote.create.mockResolvedValue({ id: 'vote-1' });
      prisma.citizenshipAdmissionVote.groupBy.mockResolvedValue([
        { vote: 'FOR', _count: 2 }, { vote: 'AGAINST', _count: 1 },
      ]);
      prisma.citizenshipAdmission.update.mockResolvedValue({});
      const result = await service.voteOnAdmission('adm-1', 'v1', 'FOR');
      expect(result.id).toBe('vote-1');
    });

    it('should throw ForbiddenException for non-INDIGENOUS voter', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'PENDING' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'CITIZEN' });
      await expect(service.voteOnAdmission('adm-1', 'v1', 'FOR')).rejects.toThrow(ForbiddenException);
    });

    it('should auto-approve when quorum FOR reached', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'PENDING', quorum: 3, applicantId: 'app-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'INDIGENOUS' });
      prisma.citizenshipAdmissionVote.create.mockResolvedValue({ id: 'vote-1' });
      prisma.citizenshipAdmissionVote.groupBy.mockResolvedValue([{ vote: 'FOR', _count: 3 }]);
      prisma.citizenshipAdmission.update.mockResolvedValue({ applicantId: 'app-1' });
      prisma.user.update.mockResolvedValue({});
      await service.voteOnAdmission('adm-1', 'v1', 'FOR');
      // resolveAdmission should be called internally
      expect(prisma.citizenshipAdmission.update).toHaveBeenCalledTimes(2);
    });
  });

  // ─── eligibility checks ───────────────
  describe('canParticipateInLegislature', () => {
    it('should return true for direct holder', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', hasExclusiveLandRight: true, khuralDelegations: [] });
      expect(await service.canParticipateInLegislature('u1')).toBe(true);
    });

    it('should return true for delegated representative', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', hasExclusiveLandRight: false, khuralDelegations: [] });
      prisma.user.findFirst.mockResolvedValue({ id: 'holder', khuralRepresentativeId: 'u1', hasExclusiveLandRight: true });
      expect(await service.canParticipateInLegislature('u1')).toBe(true);
    });

    it('should return false for non-holder non-delegate', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', hasExclusiveLandRight: false, khuralDelegations: [] });
      prisma.user.findFirst.mockResolvedValue(null);
      expect(await service.canParticipateInLegislature('u1')).toBe(false);
    });
  });

  describe('canParticipateInGovernment', () => {
    it('should return true for CITIZEN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'CITIZEN' });
      expect(await service.canParticipateInGovernment('u1')).toBe(true);
    });

    it('should return false for RESIDENT', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'RESIDENT' });
      expect(await service.canParticipateInGovernment('u1')).toBe(false);
    });
  });

  describe('canVoteInLandFund', () => {
    it('should return true for INDIGENOUS', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'INDIGENOUS' });
      expect(await service.canVoteInLandFund('u1')).toBe(true);
    });
  });

  describe('getRightHistory', () => {
    it('should return transfer history', async () => {
      prisma.exclusiveRightTransfer.findMany.mockResolvedValue([{ id: 'xr-1' }]);
      const result = await service.getRightHistory('u1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── revokeKhuralDelegation ──────────
  describe('revokeKhuralDelegation', () => {
    it('should revoke delegation', async () => {
      prisma.user.update.mockResolvedValue({ khuralRepresentativeId: null });
      const result = await service.revokeKhuralDelegation('h1');
      expect(result.success).toBe(true);
    });
  });

  // ─── listPendingAdmissions ───────────
  describe('listPendingAdmissions', () => {
    it('should return pending admissions', async () => {
      prisma.citizenshipAdmission.findMany.mockResolvedValue([{ id: 'adm-1' }]);
      const result = await service.listPendingAdmissions();
      expect(result).toHaveLength(1);
    });
  });

  // ─── voteOnAdmission AGAINST quorum ──
  describe('voteOnAdmission AGAINST quorum', () => {
    it('should auto-reject when AGAINST quorum reached', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'PENDING', quorum: 2, applicantId: 'app-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'INDIGENOUS' });
      prisma.citizenshipAdmissionVote.create.mockResolvedValue({ id: 'vote-1' });
      prisma.citizenshipAdmissionVote.groupBy.mockResolvedValue([
        { vote: 'FOR', _count: 0 },
        { vote: 'AGAINST', _count: 2 },
      ]);
      prisma.citizenshipAdmission.update.mockResolvedValue({ id: 'adm-1', status: 'REJECTED' });
      await service.voteOnAdmission('adm-1', 'v1', 'AGAINST');
      expect(prisma.citizenshipAdmission.update).toHaveBeenCalledTimes(2); // vote count + resolve
    });
  });

  // ─── voteOnAdmission admission not pending ─
  describe('voteOnAdmission non-pending', () => {
    it('should throw if admission not pending', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'APPROVED' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'INDIGENOUS' });
      await expect(service.voteOnAdmission('adm-1', 'v1', 'FOR')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── revertToFund edge cases ─────────
  describe('revertToFund edge cases', () => {
    it('should throw when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.revertToFund('bad', 'reason')).rejects.toThrow(NotFoundException);
    });
    it('should throw when user has no exclusive right', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', hasExclusiveLandRight: false, children: [] });
      await expect(service.revertToFund('u1', 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── inheritRight edge cases ─────────
  describe('inheritRight edge cases', () => {
    it('should throw when father not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.inheritRight('bad', 'son')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delegateKhuralSeat edge cases ───
  describe('delegateKhuralSeat edge cases', () => {
    it('should throw when holder not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.delegateKhuralSeat('bad', 'spouse')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── applyForCitizenship edge cases ──
  describe('applyForCitizenship edge cases', () => {
    it('should throw when pending application exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'RESIDENT' });
      prisma.citizenshipAdmission.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.applyForCitizenship('u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── voteOnAdmission edge cases ──────
  describe('voteOnAdmission edge cases', () => {
    it('should throw when admission not found', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'INDIGENOUS' });
      await expect(service.voteOnAdmission('bad', 'v1', 'FOR')).rejects.toThrow(NotFoundException);
    });
    it('should throw when voter not found', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({ id: 'adm-1', status: 'PENDING' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.voteOnAdmission('adm-1', 'bad', 'FOR')).rejects.toThrow(NotFoundException);
    });
  });
});


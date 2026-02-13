import { Test, TestingModule } from '@nestjs/testing';
import { CitizenshipService } from './citizenship.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CitizenshipService', () => {
  let service: CitizenshipService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      exclusiveRightTransfer: { create: jest.fn(), findMany: jest.fn() },
      stateLandFund: { findFirst: jest.fn() },
      citizenshipAdmission: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      admissionVote: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenshipService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CitizenshipService>(CitizenshipService);
  });

  // ─── grantInitialRight ───

  describe('grantInitialRight', () => {
    it('should grant right to MALE citizen', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1', gender: 'MALE', hasExclusiveLandRight: false,
      });

      const result = await service.grantInitialRight('user-1', 'admin-1');
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.grantInitialRight('x', 'admin'))
        .rejects.toThrow(NotFoundException);
    });

    it('should reject if user is not MALE', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2', gender: 'FEMALE', hasExclusiveLandRight: false,
      });
      await expect(service.grantInitialRight('user-2', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject if already has right', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1', gender: 'MALE', hasExclusiveLandRight: true,
      });
      await expect(service.grantInitialRight('user-1', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── inheritRight ───

  describe('inheritRight', () => {
    it('should reject if father has no right', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'father', hasExclusiveLandRight: false,
      });
      await expect(service.inheritRight('father', 'son'))
        .rejects.toThrow();
    });
  });

  // ─── canParticipateInLegislature ───

  describe('canParticipateInLegislature', () => {
    it('should return true for holder of exclusive right', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', hasExclusiveLandRight: true, khuralDelegatedTo: null,
      });
      expect(await service.canParticipateInLegislature('u1')).toBe(true);
    });

    it('should return false for user without exclusive right and not delegated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2', hasExclusiveLandRight: false, khuralDelegatedTo: null,
      });
      expect(await service.canParticipateInLegislature('u2')).toBe(false);
    });
  });

  // ─── canParticipateInGovernment ───

  describe('canParticipateInGovernment', () => {
    it('should return true for CITIZEN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'CITIZEN' });
      expect(await service.canParticipateInGovernment('u1')).toBe(true);
    });

    it('should return true for INDIGENOUS', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', citizenType: 'INDIGENOUS' });
      expect(await service.canParticipateInGovernment('u2')).toBe(true);
    });

    it('should return false for RESIDENT', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u3', citizenType: 'RESIDENT' });
      expect(await service.canParticipateInGovernment('u3')).toBe(false);
    });
  });

  // ─── voteOnAdmission ───

  describe('voteOnAdmission', () => {
    it('should reject if voter is not INDIGENOUS', async () => {
      prisma.citizenshipAdmission.findUnique.mockResolvedValue({
        id: 'adm-1', status: 'PENDING',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'voter-1', citizenType: 'CITIZEN',
      });
      await expect(service.voteOnAdmission('adm-1', 'voter-1', 'FOR'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ─── applyForCitizenship ───

  describe('applyForCitizenship', () => {
    it('should reject if already CITIZEN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'CITIZEN' });
      await expect(service.applyForCitizenship('u1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject if INDIGENOUS', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', citizenType: 'INDIGENOUS' });
      await expect(service.applyForCitizenship('u2'))
        .rejects.toThrow(BadRequestException);
    });
  });
});

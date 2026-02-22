import { Test, TestingModule } from '@nestjs/testing';
import { LegalContractService } from './legal-contract.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, SignatoryRole } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const makePrisma = () => {
  const p: any = {
    contractTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
    legalContract: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    contractSignatory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    templeSnapshot: { create: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb: any, _o?: any) =>
      typeof cb === 'function' ? cb(p) : Promise.all(cb),
    ),
  };
  return p;
};

const TEMPLATE = {
  id: 'tpl-1',
  code: 'ZUN-LABOR-v1',
  requiredRank: 1,
  isActive: true,
  bodyTemplate: '...',
};

const CONTRACT = {
  id: 'ctr-1',
  templateId: 'tpl-1',
  template: TEMPLATE,
  title: 'Test Contract',
  partyAId: 'user-a',
  partyBId: 'user-b',
  bankRequisites: {},
  legalAddress: 'Улан-Удэ, ул. Ленина 1',
  status: ContractStatus.PENDING_SIGNATURES,
  requiredRank: 1,
  contractHash: null,
  activatedAt: null,
  expiresAt: new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000),
  signatories: [],
  snapshot: null,
  partyA: { id: 'user-a', username: 'AliceLeader' },
  partyB: { id: 'user-b', username: 'BobCitizen' },
};

describe('LegalContractService', () => {
  let service: LegalContractService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalContractService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LegalContractService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ────────────────────────────────────────────────────────────────
  // Rule 3: generateFromTemplate
  // ────────────────────────────────────────────────────────────────
  describe('generateFromTemplate (Rule 3 — template-only origin)', () => {
    it('creates a contract from a valid template', async () => {
      prisma.contractTemplate.findUnique.mockResolvedValue(TEMPLATE);
      prisma.legalContract.create.mockResolvedValue({ id: 'ctr-1' });

      const result = await service.generateFromTemplate({
        templateId: 'tpl-1',
        title: 'Test',
        partyAId: 'user-a',
        partyBId: 'user-b',
        bankRequisites: {
          partyA: { bank: 'Sber', account: '001', bic: '123' },
          partyB: { bank: 'VTB', account: '002', bic: '456' },
        },
        legalAddress: 'Улан-Удэ',
      });

      expect(result.id).toBe('ctr-1');
      expect(prisma.legalContract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: 'tpl-1',
            status: ContractStatus.DRAFT,
            requiredRank: 1,
          }),
        }),
      );
    });

    it('throws NotFoundException if template not found', async () => {
      prisma.contractTemplate.findUnique.mockResolvedValue(null);
      await expect(
        service.generateFromTemplate({
          templateId: 'bad-tpl',
          title: 'T',
          partyAId: 'a',
          partyBId: 'b',
          bankRequisites: { partyA: { bank: '', account: '', bic: '' }, partyB: { bank: '', account: '', bic: '' } },
          legalAddress: '',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if partyA === partyB (same person contract)', async () => {
      prisma.contractTemplate.findUnique.mockResolvedValue(TEMPLATE);
      await expect(
        service.generateFromTemplate({
          templateId: 'tpl-1',
          title: 'Self-contract',
          partyAId: 'same-user',
          partyBId: 'same-user',
          bankRequisites: { partyA: { bank: '', account: '', bic: '' }, partyB: { bank: '', account: '', bic: '' } },
          legalAddress: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Rule 1: 1% Mediator Cap — addSignatory
  // ────────────────────────────────────────────────────────────────
  describe('addSignatory — Rule 1: 1% Mediator Cap', () => {
    beforeEach(() => {
      prisma.legalContract.findUnique.mockResolvedValue(CONTRACT);
      prisma.contractSignatory.findUnique.mockResolvedValue(null);
      prisma.contractSignatory.create.mockResolvedValue({ id: 'sig-1' });
      prisma.legalContract.update.mockResolvedValue({});
    });

    it('allows mediator with 0.5% fee (under cap)', async () => {
      prisma.contractSignatory.findMany.mockResolvedValue([]); // no existing mediators
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'med-1',
          role: SignatoryRole.MEDIATOR,
          feePercent: 0.005,
        }),
      ).resolves.not.toThrow();
    });

    it('rejects mediator that pushes total over 1% (Rule 1)', async () => {
      prisma.contractSignatory.findMany.mockResolvedValue([
        { feePercent: new Prisma.Decimal('0.007') }, // 0.7% already used
      ]);
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'med-2',
          role: SignatoryRole.MEDIATOR,
          feePercent: 0.005, // 0.7 + 0.5 = 1.2% > 1%
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects mediator without feePercent', async () => {
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'med-3',
          role: SignatoryRole.MEDIATOR,
          // no feePercent
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects mediator with non-positive feePercent', async () => {
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'med-4',
          role: SignatoryRole.MEDIATOR,
          feePercent: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Rule 2: Rank Clearance — addSignatory NOTARY
  // ────────────────────────────────────────────────────────────────
  describe('addSignatory — Rule 2: Rank Clearance', () => {
    beforeEach(() => {
      prisma.legalContract.findUnique.mockResolvedValue(CONTRACT);
      prisma.contractSignatory.findUnique.mockResolvedValue(null);
    });

    it('allows notary with sufficient rank', async () => {
      prisma.contractSignatory.create.mockResolvedValue({ id: 'sig-notary' });
      prisma.legalContract.update.mockResolvedValue({});
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'notary-1',
          role: SignatoryRole.NOTARY,
          notaryRank: 2, // contract requires 1
        }),
      ).resolves.not.toThrow();
    });

    it('rejects notary with insufficient rank (Rule 2)', async () => {
      const highRankContract = { ...CONTRACT, requiredRank: 3 };
      prisma.legalContract.findUnique.mockResolvedValue(highRankContract);
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'notary-junior',
          role: SignatoryRole.NOTARY,
          notaryRank: 1, // 1 < 3
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects notary without notaryRank', async () => {
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'notary-blank',
          role: SignatoryRole.NOTARY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate signatory slot', async () => {
      prisma.contractSignatory.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.addSignatory('ctr-1', {
          userId: 'notary-1',
          role: SignatoryRole.NOTARY,
          notaryRank: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Rule 4: tryActivate — multi-sig gate
  // ────────────────────────────────────────────────────────────────
  describe('tryActivate (Rule 4 — multi-sig gate)', () => {
    const makeSig = (role: SignatoryRole, isConfirmed: boolean, rank = 1) => ({
      id: `sig-${role}`,
      role,
      isConfirmed,
      notaryRank: role === SignatoryRole.NOTARY ? rank : null,
      signatureHash: isConfirmed ? 'hash-' + role : null,
      feePercent: role === SignatoryRole.MEDIATOR ? 0.005 : null,
    });

    it('activates when all Rule 4 requirements met', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.PENDING_SIGNATURES,
        signatories: [
          makeSig(SignatoryRole.LAWYER, true),
          makeSig(SignatoryRole.NOTARY, true, 2),
        ],
      });
      prisma.legalContract.update.mockResolvedValue({ ...CONTRACT, status: ContractStatus.ACTIVE });

      await expect(service.tryActivate('ctr-1')).resolves.not.toThrow();
      expect(prisma.legalContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ContractStatus.ACTIVE }),
        }),
      );
    });

    it('rejects if no confirmed LAWYER', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.PENDING_SIGNATURES,
        signatories: [makeSig(SignatoryRole.NOTARY, true, 1)], // no lawyer
      });
      await expect(service.tryActivate('ctr-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects if no confirmed NOTARY with sufficient rank', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.PENDING_SIGNATURES,
        requiredRank: 3,
        signatories: [
          makeSig(SignatoryRole.LAWYER, true),
          makeSig(SignatoryRole.NOTARY, true, 1), // rank 1 < 3
        ],
      });
      await expect(service.tryActivate('ctr-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects if unconfirmed mediator (must be ALL mediators)', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.PENDING_SIGNATURES,
        signatories: [
          makeSig(SignatoryRole.LAWYER, true),
          makeSig(SignatoryRole.NOTARY, true, 1),
          makeSig(SignatoryRole.MEDIATOR, false), // unsigned
        ],
      });
      await expect(service.tryActivate('ctr-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if already ACTIVE', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.ACTIVE,
        signatories: [],
      });
      await expect(service.tryActivate('ctr-1')).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Archive & TempleSnapshot
  // ────────────────────────────────────────────────────────────────
  describe('archiveContract', () => {
    it('creates a TempleSnapshot with SHA-256 archiveHash', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        status: ContractStatus.COMPLETED,
        snapshot: null,
        signatories: [],
      });
      prisma.legalContract.update.mockResolvedValue({});
      prisma.templeSnapshot.create.mockResolvedValue({ id: 'snap-1' });

      const result = await service.archiveContract('ctr-1');
      expect(result.archiveHash).toHaveLength(64); // SHA-256 hex
      expect(prisma.templeSnapshot.create).toHaveBeenCalled();
    });

    it('throws ConflictException if already archived', async () => {
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        snapshot: { id: 'snap-existing' },
      });
      await expect(service.archiveContract('ctr-1')).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Cron: checkAndArchiveExpired
  // ────────────────────────────────────────────────────────────────
  describe('checkAndArchiveExpired (cron)', () => {
    it('auto-archives expired COMPLETED contracts', async () => {
      prisma.legalContract.updateMany.mockResolvedValue({ count: 1 });
      prisma.legalContract.findMany.mockResolvedValue([{ id: 'ctr-expired' }]);
      // archiveContract internal call
      prisma.legalContract.findUnique.mockResolvedValue({
        ...CONTRACT,
        id: 'ctr-expired',
        status: ContractStatus.COMPLETED,
        snapshot: null,
        signatories: [],
      });
      prisma.legalContract.update.mockResolvedValue({});
      prisma.templeSnapshot.create.mockResolvedValue({ id: 'snap-new' });

      await expect(service.checkAndArchiveExpired()).resolves.not.toThrow();
      expect(prisma.templeSnapshot.create).toHaveBeenCalled();
    });

    it('skips if no expired contracts', async () => {
      prisma.legalContract.updateMany.mockResolvedValue({ count: 0 });
      prisma.legalContract.findMany.mockResolvedValue([]);

      await expect(service.checkAndArchiveExpired()).resolves.not.toThrow();
      expect(prisma.templeSnapshot.create).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DigitalSealService } from './digital-seal.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';

// Mock ethers
jest.mock('ethers', () => ({
  Contract: jest.fn().mockImplementation(() => ({
    approve: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
    revoke: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
    execute: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
    verify: jest.fn().mockResolvedValue([true, false, 2n]),
  })),
  keccak256: jest.fn().mockReturnValue('0xhash'),
  toUtf8Bytes: jest.fn().mockReturnValue(new Uint8Array()),
}));

describe('DigitalSealService', () => {
  let service: DigitalSealService;
  let prisma: any;
  let blockchain: any;

  const mockSeal = {
    id: 's1', contractAddress: '0xSEAL', signer1SeatId: 'seat-1', signer2SeatId: 'seat-2',
    title: 'Agreement', executed: false, approvalCount: 0,
    signer1Approved: false, signer2Approved: false, documentHash: null,
  };

  const mockPrisma = () => ({
    user: { findUnique: jest.fn() },
    digitalSeal: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  });

  const mockBlockchain = () => ({
    getProvider: jest.fn().mockReturnValue({}),
    deployContract: jest.fn().mockResolvedValue({ getAddress: jest.fn().mockResolvedValue('0xSEAL') }),
    getContractWithSigner: jest.fn().mockReturnValue({}),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalSealService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: BlockchainService, useFactory: mockBlockchain },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('0xDEPLOYER') },
        },
      ],
    }).compile();
    service = module.get(DigitalSealService);
    prisma = module.get(PrismaService);
    blockchain = module.get(BlockchainService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createSeal ────────────────────────
  describe('createSeal', () => {
    it('should create seal without bytecode (mock deployment)', async () => {
      delete process.env.DIGITAL_SEAL_BYTECODE;
      prisma.user.findUnique
        .mockResolvedValueOnce({ walletAddress: '0xAddr1' })
        .mockResolvedValueOnce({ walletAddress: '0xAddr2' });
      prisma.digitalSeal.create.mockResolvedValue(mockSeal);
      const result = await service.createSeal({ signer1SeatId: 'seat-1', signer2SeatId: 'seat-2' });
      expect(result.id).toBe('s1');
    });

    it('should throw if signer has no wallet', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ walletAddress: null })
        .mockResolvedValueOnce({ walletAddress: '0xAddr2' });
      await expect(service.createSeal({ signer1SeatId: 'seat-1', signer2SeatId: 'seat-2' }))
        .rejects.toThrow('One or both signers do not have wallet addresses');
    });
  });

  // ─── approveSeal ───────────────────────
  describe('approveSeal', () => {
    it('should approve seal as signer1', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      prisma.digitalSeal.update.mockResolvedValue({ ...mockSeal, approvalCount: 1, signer1Approved: true });
      const result = await service.approveSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' });
      expect(result.signer1Approved).toBe(true);
    });

    it('should throw for non-signer', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      await expect(service.approveSeal('s1', { seatId: 'other', privateKey: '0xkey' }))
        .rejects.toThrow('Caller is not a signer');
    });

    it('should throw for already executed seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, executed: true });
      await expect(service.approveSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Seal already executed');
    });
  });

  // ─── revokeSeal ────────────────────────
  describe('revokeSeal', () => {
    it('should revoke seal as signer', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, signer1Approved: true });
      prisma.digitalSeal.update.mockResolvedValue({ ...mockSeal, signer1Approved: false });
      const result = await service.revokeSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' });
      expect(result.signer1Approved).toBe(false);
    });

    it('should throw for executed seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, executed: true });
      await expect(service.revokeSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Cannot revoke executed seal');
    });
  });

  // ─── executeSeal ───────────────────────
  describe('executeSeal', () => {
    it('should execute seal with sufficient approvals', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, approvalCount: 2 });
      prisma.digitalSeal.update.mockResolvedValue({ ...mockSeal, executed: true });
      const result = await service.executeSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' });
      expect(result.executed).toBe(true);
    });

    it('should throw for insufficient approvals', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, approvalCount: 1 });
      await expect(service.executeSeal('s1', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Insufficient approvals');
    });
  });

  // ─── getSealStatus ────────────────────
  describe('getSealStatus', () => {
    it('should return seal with on-chain status', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      const result = await service.getSealStatus('s1');
      expect(result.onChain.approved).toBe(true);
      expect(result.onChain.approvalCount).toBe(2);
    });

    it('should throw for missing seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      await expect(service.getSealStatus('bad')).rejects.toThrow('Seal not found');
    });
  });

  // ─── getSealsForUser ──────────────────
  describe('getSealsForUser', () => {
    it('should return user seals', async () => {
      prisma.digitalSeal.findMany.mockResolvedValue([mockSeal]);
      const result = await service.getSealsForUser('seat-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getSeal ──────────────────────────
  describe('getSeal', () => {
    it('should return seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      const result = await service.getSeal('s1');
      expect(result!.id).toBe('s1');
    });

    it('should return null for non-existent seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      const result = await service.getSeal('bad');
      expect(result).toBeNull();
    });
  });

  // ─── approveSeal as signer2 ───────────
  describe('approveSeal as signer2', () => {
    it('should approve seal as signer2', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      prisma.digitalSeal.update.mockResolvedValue({ ...mockSeal, approvalCount: 1, signer2Approved: true });
      const result = await service.approveSeal('s1', { seatId: 'seat-2', privateKey: '0xkey' });
      expect(result.signer2Approved).toBe(true);
    });
  });

  // ─── seal not found ───────────────────
  describe('seal not found cases', () => {
    it('approveSeal should throw for missing seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      await expect(service.approveSeal('bad', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Seal not found');
    });

    it('revokeSeal should throw for missing seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      await expect(service.revokeSeal('bad', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Seal not found');
    });

    it('executeSeal should throw for missing seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      await expect(service.executeSeal('bad', { seatId: 'seat-1', privateKey: '0xkey' }))
        .rejects.toThrow('Seal not found');
    });
  });

  // ─── revokeSeal as non-signer ─────────
  describe('revokeSeal as non-signer', () => {
    it('should throw for non-signer', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(mockSeal);
      await expect(service.revokeSeal('s1', { seatId: 'other', privateKey: '0xkey' }))
        .rejects.toThrow('Caller is not a signer');
    });
  });

  // ─── additional coverage tests ────────
  describe('additional coverage', () => {
    it('createSeal with DIGITAL_SEAL_BYTECODE set', async () => {
      process.env.DIGITAL_SEAL_BYTECODE = '0xBYTECODE';
      prisma.user.findUnique
        .mockResolvedValueOnce({ walletAddress: '0xAddr1' })
        .mockResolvedValueOnce({ walletAddress: '0xAddr2' });
      prisma.digitalSeal.create.mockResolvedValue(mockSeal);
      blockchain.deployContract.mockResolvedValue({ getAddress: jest.fn().mockResolvedValue('0xNEW') });

      const result = await service.createSeal({ signer1SeatId: 'seat-1', signer2SeatId: 'seat-2' });
      expect(result.id).toBe('s1');
      delete process.env.DIGITAL_SEAL_BYTECODE;
    });

    it('createSeal throws when both signers have no wallet', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ walletAddress: null })
        .mockResolvedValueOnce({ walletAddress: null });
      await expect(service.createSeal({ signer1SeatId: 'seat-1', signer2SeatId: 'seat-2' }))
        .rejects.toThrow('One or both signers do not have wallet addresses');
    });

    it('revokeSeal as signer2', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, signer2Approved: true });
      prisma.digitalSeal.update.mockResolvedValue({ ...mockSeal, signer2Approved: false });
      const result = await service.revokeSeal('s1', { seatId: 'seat-2', privateKey: '0xkey' });
      expect(result.signer2Approved).toBe(false);
    });

    it('executeSeal throws for non-signer', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ ...mockSeal, approvalCount: 2 });
      await expect(service.executeSeal('s1', { seatId: 'other', privateKey: '0xkey' }))
        .rejects.toThrow('Caller is not a signer');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AcademyOfSciencesService } from './academy.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('AcademyOfSciencesService', () => {
  let service: AcademyOfSciencesService;
  let prisma: any;
  let blockchain: any;

  const mockTxReceipt = {
    logs: [{ fragment: { name: 'PatentSubmitted' }, args: [1n] }],
  };
  const mockTx = { wait: jest.fn().mockResolvedValue(mockTxReceipt) };
  const mockContract = {
    submitPatent: jest.fn().mockResolvedValue(mockTx),
    reviewPatent: jest.fn().mockResolvedValue(mockTx),
    registerDiscovery: jest.fn().mockResolvedValue(mockTx),
    peerReviewDiscovery: jest.fn().mockResolvedValue(mockTx),
    requestGrant: jest.fn().mockResolvedValue(mockTx),
    approveGrant: jest.fn().mockResolvedValue(mockTx),
  };

  const mockPrisma = () => ({
    patent: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
    discovery: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
    researchGrant: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
  });

  const mockBlockchain = () => ({
    getContractWithSigner: jest.fn().mockReturnValue(mockContract),
    getProvider: jest.fn().mockReturnValue({}),
  });

  beforeEach(async () => {
    process.env.ACADEMY_OF_SCIENCES_ADDRESS = '0xACADEMY';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademyOfSciencesService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: BlockchainService, useFactory: mockBlockchain },
      ],
    }).compile();
    service = module.get(AcademyOfSciencesService);
    prisma = module.get(PrismaService);
    blockchain = module.get(BlockchainService);
  });

  afterEach(() => {
    delete process.env.ACADEMY_OF_SCIENCES_ADDRESS;
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── Patent Management ─────────────────
  describe('submitPatent', () => {
    it('should submit patent on-chain and save to DB', async () => {
      prisma.patent.create.mockResolvedValue({ id: 'p1', patentId: 1, title: 'Quantum' });
      const result = await service.submitPatent({
        submitterSeatId: 'seat-1', patentHash: '0xhash', title: 'Quantum', field: 'Physics', privateKey: '0xkey',
      });
      expect(result.patentId).toBe(1);
      expect(mockContract.submitPatent).toHaveBeenCalled();
    });
  });

  describe('reviewPatent', () => {
    it('should approve patent', async () => {
      prisma.patent.findUnique.mockResolvedValue({ id: 'p1', patentId: 1 });
      prisma.patent.update.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      const result = await service.reviewPatent('p1', { reviewerPrivateKey: '0xkey', approve: true, notes: 'Good' });
      expect(result.status).toBe('APPROVED');
    });

    it('should reject patent', async () => {
      prisma.patent.findUnique.mockResolvedValue({ id: 'p1', patentId: 1 });
      prisma.patent.update.mockResolvedValue({ id: 'p1', status: 'REJECTED' });
      const result = await service.reviewPatent('p1', { reviewerPrivateKey: '0xkey', approve: false, notes: 'Weak' });
      expect(result.status).toBe('REJECTED');
    });

    it('should throw for missing patent', async () => {
      prisma.patent.findUnique.mockResolvedValue(null);
      await expect(service.reviewPatent('bad', { reviewerPrivateKey: '0xkey', approve: true, notes: '' })).rejects.toThrow('Patent not found');
    });
  });

  describe('getPatent', () => {
    it('should return patent', async () => {
      prisma.patent.findUnique.mockResolvedValue({ id: 'p1' });
      const result = await service.getPatent('p1');
      expect(result.id).toBe('p1');
    });
  });

  describe('getPatentsBySubmitter', () => {
    it('should return patents by submitter', async () => {
      prisma.patent.findMany.mockResolvedValue([{ id: 'p1' }]);
      const result = await service.getPatentsBySubmitter('seat-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── Discovery Management ─────────────
  describe('registerDiscovery', () => {
    it('should register discovery on-chain and save to DB', async () => {
      const receipt = { logs: [{ fragment: { name: 'DiscoveryRegistered' }, args: [2n] }] };
      mockTx.wait.mockResolvedValueOnce(receipt);
      prisma.discovery.create.mockResolvedValue({ id: 'd1', discoveryId: 2 });
      const result = await service.registerDiscovery({
        scientistSeatId: 'seat-1', discoveryHash: '0xhash', title: 'Dark Matter', description: 'Found it', privateKey: '0xkey',
      });
      expect(result.discoveryId).toBe(2);
    });
  });

  describe('peerReviewDiscovery', () => {
    it('should increment peer review count', async () => {
      prisma.discovery.findUnique.mockResolvedValue({ id: 'd1', discoveryId: 2 });
      prisma.discovery.update.mockResolvedValue({ id: 'd1', peerReviews: 3 });
      const result = await service.peerReviewDiscovery('d1', { reviewerPrivateKey: '0xkey' });
      expect(result.peerReviews).toBe(3);
    });

    it('should throw for missing discovery', async () => {
      prisma.discovery.findUnique.mockResolvedValue(null);
      await expect(service.peerReviewDiscovery('bad', { reviewerPrivateKey: '0xkey' })).rejects.toThrow('Discovery not found');
    });
  });

  describe('getDiscovery', () => {
    it('should return discovery', async () => {
      prisma.discovery.findUnique.mockResolvedValue({ id: 'd1' });
      expect((await service.getDiscovery('d1')).id).toBe('d1');
    });
  });

  describe('getDiscoveriesByScientist', () => {
    it('should return discoveries', async () => {
      prisma.discovery.findMany.mockResolvedValue([{ id: 'd1' }]);
      expect(await service.getDiscoveriesByScientist('seat-1')).toHaveLength(1);
    });
  });

  // ─── Grant Management ──────────────────
  describe('requestGrant', () => {
    it('should request grant on-chain and save to DB', async () => {
      const receipt = { logs: [{ fragment: { name: 'GrantRequested' }, args: [3n] }] };
      mockTx.wait.mockResolvedValueOnce(receipt);
      prisma.researchGrant.create.mockResolvedValue({ id: 'g1', grantId: 3, status: 'REQUESTED' });
      const result = await service.requestGrant({
        scientistSeatId: 'seat-1', projectTitle: 'AI Research', description: 'ML for governance', amount: '1000000', privateKey: '0xkey',
      });
      expect(result.status).toBe('REQUESTED');
    });
  });

  describe('approveGrant', () => {
    it('should approve grant', async () => {
      prisma.researchGrant.findUnique.mockResolvedValue({ id: 'g1', grantId: 3 });
      prisma.researchGrant.update.mockResolvedValue({ id: 'g1', status: 'APPROVED' });
      const result = await service.approveGrant('g1', { reviewerPrivateKey: '0xkey', approvedAmount: '800000' });
      expect(result.status).toBe('APPROVED');
    });

    it('should throw for missing grant', async () => {
      prisma.researchGrant.findUnique.mockResolvedValue(null);
      await expect(service.approveGrant('bad', { reviewerPrivateKey: '0xkey', approvedAmount: '100' })).rejects.toThrow('Grant not found');
    });
  });

  describe('getGrant', () => {
    it('should return grant', async () => {
      prisma.researchGrant.findUnique.mockResolvedValue({ id: 'g1' });
      expect((await service.getGrant('g1')).id).toBe('g1');
    });
  });

  describe('getGrantsByScientist', () => {
    it('should return grants', async () => {
      prisma.researchGrant.findMany.mockResolvedValue([{ id: 'g1' }]);
      expect(await service.getGrantsByScientist('seat-1')).toHaveLength(1);
    });
  });
});

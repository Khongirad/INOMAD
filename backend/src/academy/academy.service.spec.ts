import { Test, TestingModule } from '@nestjs/testing';
import { AcademyOfSciencesService } from './academy.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('AcademyOfSciencesService', () => {
  let service: AcademyOfSciencesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      patent: {
        create: jest.fn().mockResolvedValue({ id: 'pat-1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      discovery: {
        create: jest.fn().mockResolvedValue({ id: 'disc-1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      researchGrant: {
        create: jest.fn().mockResolvedValue({ id: 'grant-1' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };

    const blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
      getProvider: jest.fn(),
      getContractAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademyOfSciencesService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<AcademyOfSciencesService>(AcademyOfSciencesService);
  });

  describe('getPatent', () => {
    it('should return patent by ID', async () => {
      prisma.patent.findUnique.mockResolvedValue({ id: 'pat-1', title: 'Test' });
      const result = await service.getPatent('pat-1');
      expect(result.title).toBe('Test');
    });
  });

  describe('getPatentsBySubmitter', () => {
    it('should return patents by submitter', async () => {
      await service.getPatentsBySubmitter('SEAT-1');
      expect(prisma.patent.findMany).toHaveBeenCalled();
    });
  });

  describe('getDiscovery', () => {
    it('should return discovery by ID', async () => {
      prisma.discovery.findUnique.mockResolvedValue({ id: 'disc-1', title: 'Test' });
      const result = await service.getDiscovery('disc-1');
      expect(result.title).toBe('Test');
    });
  });

  describe('getDiscoveriesByScientist', () => {
    it('should return discoveries by scientist', async () => {
      await service.getDiscoveriesByScientist('SEAT-1');
      expect(prisma.discovery.findMany).toHaveBeenCalled();
    });
  });

  describe('getGrant', () => {
    it('should return grant by ID', async () => {
      prisma.researchGrant.findUnique.mockResolvedValue({ id: 'grant-1', projectTitle: 'Research' });
      const result = await service.getGrant('grant-1');
      expect(result.projectTitle).toBe('Research');
    });
  });

  describe('getGrantsByScientist', () => {
    it('should return grants by scientist', async () => {
      await service.getGrantsByScientist('SEAT-1');
      expect(prisma.researchGrant.findMany).toHaveBeenCalled();
    });
  });
});

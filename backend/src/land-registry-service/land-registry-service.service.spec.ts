import { Test, TestingModule } from '@nestjs/testing';
import { LandRegistryServiceService } from './land-registry-service.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LandRegistryServiceService', () => {
  let service: LandRegistryServiceService;
  let prisma: any;

  const mockPlot = {
    id: 'plot-1',
    cadastralNumber: 'CAD-001',
    area: 1000,
    landType: 'RESIDENTIAL',
    address: '123 Test Avenue',
    region: 'Central',
    latitude: 51.8,
    longitude: 107.6,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOwnership = {
    id: 'own-1',
    plotId: 'plot-1',
    ownerId: 'user-1',
    ownershipType: 'PRIVATE',
    sharePercent: 100,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      landPlot: {
        create: jest.fn().mockResolvedValue(mockPlot),
        findUnique: jest.fn().mockResolvedValue(mockPlot),
        findFirst: jest.fn().mockResolvedValue(mockPlot),
        findMany: jest.fn().mockResolvedValue([mockPlot]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
        aggregate: jest.fn().mockResolvedValue({ _avg: { area: 1000 } }),
      },
      landOwnership: {
        create: jest.fn().mockResolvedValue(mockOwnership),
        findMany: jest.fn().mockResolvedValue([mockOwnership]),
        findUnique: jest.fn().mockResolvedValue(mockOwnership),
        findFirst: jest.fn().mockResolvedValue(mockOwnership),
        update: jest.fn(),
      },
      landLease: {
        create: jest.fn().mockResolvedValue({ id: 'lease-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      landTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-1', status: 'INITIATED' }),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(3),
      },
      landProperty: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandRegistryServiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LandRegistryServiceService>(LandRegistryServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchLandPlots', () => {
    it('should return all land plots', async () => {
      const result = await service.searchLandPlots({});

      expect(prisma.landPlot.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should filter by region', async () => {
      await service.searchLandPlots({ region: 'Central' });

      expect(prisma.landPlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ region: 'Central' }),
        }),
      );
    });
  });

  describe('searchLandPlotsByGPS', () => {
    it('should search by GPS bounds', async () => {
      const result = await service.searchLandPlotsByGPS({
        northEast: { lat: 52.0, lng: 108.0 },
        southWest: { lat: 51.0, lng: 107.0 },
      });

      expect(prisma.landPlot.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getMyOwnerships', () => {
    it('should return ownerships for user', async () => {
      const result = await service.getMyOwnerships('user-1');

      expect(prisma.landOwnership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'user-1', isActive: true } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getMyLeases', () => {
    it('should return leases for user', async () => {
      const result = await service.getMyLeases('user-1');

      expect(prisma.landLease.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getMarketTrends', () => {
    it('should return market data for region', async () => {
      const result = await service.getMarketTrends('Central');

      expect(result).toBeDefined();
      expect(result.region).toBe('Central');
    });
  });
});

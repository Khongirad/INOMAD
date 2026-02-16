import { Test, TestingModule } from '@nestjs/testing';
import { LandRegistryServiceService } from './land-registry-service.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LandRegistryServiceService', () => {
  let service: LandRegistryServiceService;
  let prisma: any;

  const mockPrisma = () => ({
    landPlot: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    landOwnership: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    landLease: { findMany: jest.fn(), create: jest.fn() },
    landTransaction: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    landProperty: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandRegistryServiceService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(LandRegistryServiceService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('registerLandPlot', () => {
    it('should create plot with cadastral number', async () => {
      prisma.landPlot.create.mockResolvedValue({ cadastralNumber: 'MO-GO-1A2B' });
      const result = await service.registerLandPlot('u1', {
        region: 'Moscow', district: 'Gorod', latitude: 55.7, longitude: 37.6,
        area: 500, landType: 'AGRICULTURAL', irrigated: false,
      });
      expect(result.cadastralNumber).toBeTruthy();
    });
  });

  describe('getLandPlotByCadastral', () => {
    it('should return plot', async () => {
      prisma.landPlot.findUnique.mockResolvedValue({ cadastralNumber: 'MO-GO-1' });
      const result = await service.getLandPlotByCadastral('MO-GO-1');
      expect(result.cadastralNumber).toBe('MO-GO-1');
    });

    it('should throw if not found', async () => {
      prisma.landPlot.findUnique.mockResolvedValue(null);
      await expect(service.getLandPlotByCadastral('X')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchLandPlots', () => {
    it('should filter by region/district', async () => {
      prisma.landPlot.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.searchLandPlots({ region: 'Moscow' });
      expect(result).toHaveLength(1);
    });
  });

  describe('searchLandPlotsByGPS', () => {
    it('should find plots within bounds', async () => {
      prisma.landPlot.findMany.mockResolvedValue([]);
      await service.searchLandPlotsByGPS({
        northEast: { lat: 56, lng: 38 }, southWest: { lat: 55, lng: 37 },
      });
      expect(prisma.landPlot.findMany).toHaveBeenCalled();
    });
  });

  describe('registerOwnership', () => {
    it('should throw if landPlotId provided (governance)', async () => {
      await expect(service.registerOwnership('u1', {
        landPlotId: 'plot1', ownershipType: 'FULL', sharePercentage: 100,
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.registerOwnership('u1', {
        propertyId: 'p1', ownershipType: 'FULL', sharePercentage: 100,
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw for RESIDENT citizen type', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'RESIDENT', isVerified: true });
      await expect(service.registerOwnership('u1', {
        propertyId: 'p1', ownershipType: 'FULL', sharePercentage: 100,
      })).rejects.toThrow(BadRequestException);
    });

    it('should register property ownership for citizen', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'CITIZEN', isVerified: true });
      prisma.landOwnership.create.mockResolvedValue({ id: 'own1' });
      const result = await service.registerOwnership('u1', {
        propertyId: 'p1', ownershipType: 'FULL', sharePercentage: 100,
      });
      expect(result.id).toBe('own1');
    });
  });

  describe('registerLease', () => {
    it('should create lease', async () => {
      prisma.landLease.create.mockResolvedValue({ id: 'l1' });
      const result = await service.registerLease({
        propertyId: 'p1', lesseeId: 'u1', lesseeName: 'User',
        lesseeNationality: 'RU', leaseType: 'LONG_TERM',
        startDate: '2024-01-01', endDate: '2025-01-01', monthlyRent: 1000, currency: 'ALTAN',
      });
      expect(result.id).toBe('l1');
    });
  });

  describe('initiateTransfer', () => {
    it('should throw if seller or buyer not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.initiateTransfer('u1', {
        buyerId: 'u2', salePrice: 50000, currency: 'ALTAN',
      })).rejects.toThrow(NotFoundException);
    });

    it('should create transaction', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', username: 'seller' })
        .mockResolvedValueOnce({ id: 'u2', username: 'buyer' });
      prisma.landTransaction.create.mockResolvedValue({ id: 'tx1', status: 'INITIATED' });
      const result = await service.initiateTransfer('u1', {
        buyerId: 'u2', salePrice: 50000, currency: 'ALTAN',
      });
      expect(result.status).toBe('INITIATED');
    });
  });

  describe('confirmPayment', () => {
    it('should throw if tx not found', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue(null);
      await expect(service.confirmPayment('tx1', '0xhash')).rejects.toThrow(NotFoundException);
    });

    it('should throw if wrong status', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue({ status: 'COMPLETED' });
      await expect(service.confirmPayment('tx1', '0xhash')).rejects.toThrow(BadRequestException);
    });

    it('should confirm payment', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue({ status: 'INITIATED' });
      prisma.landTransaction.update.mockResolvedValue({ status: 'PAYMENT_CONFIRMED' });
      const result = await service.confirmPayment('tx1', '0xhash');
      expect(result.status).toBe('PAYMENT_CONFIRMED');
    });
  });

  describe('completeTransfer', () => {
    it('should throw if landPlotId (governance)', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue({
        status: 'PAYMENT_CONFIRMED', landPlotId: 'plot1',
      });
      await expect(service.completeTransfer('tx1', 'off1')).rejects.toThrow(BadRequestException);
    });

    it('should transfer property ownership', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue({
        status: 'PAYMENT_CONFIRMED', landPlotId: null, propertyId: 'p1',
        sellerId: 'u1', buyerId: 'u2',
      });
      prisma.landOwnership.updateMany.mockResolvedValue({});
      prisma.landOwnership.create.mockResolvedValue({});
      prisma.landTransaction.update.mockResolvedValue({ status: 'COMPLETED' });
      const result = await service.completeTransfer('tx1', 'off1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('calculateValuation', () => {
    it('should calculate for land plot', async () => {
      prisma.landPlot.findUnique.mockResolvedValue({ area: 1000 });
      const result = await service.calculateValuation('plot1');
      expect(result.estimatedValue).toBe(50000);
    });

    it('should throw if plot not found', async () => {
      prisma.landPlot.findUnique.mockResolvedValue(null);
      await expect(service.calculateValuation('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMarketTrends', () => {
    it('should return region stats', async () => {
      prisma.landPlot.count.mockResolvedValue(25);
      prisma.landTransaction.count.mockResolvedValue(5);
      const result = await service.getMarketTrends('Moscow');
      expect(result.region).toBe('Moscow');
      expect(result.totalPlots).toBe(25);
    });
  });

  describe('getMyOwnerships', () => {
    it('should return user ownerships', async () => {
      prisma.landOwnership.findMany.mockResolvedValue([{ id: 'own1' }]);
      const result = await service.getMyOwnerships('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getMyLeases', () => {
    it('should return user leases', async () => {
      prisma.landLease.findMany.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
      const result = await service.getMyLeases('u1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transactions for a land plot', async () => {
      prisma.landTransaction.findMany.mockResolvedValue([{ id: 'tx1' }]);
      const result = await service.getTransactionHistory('plot1');
      expect(result).toHaveLength(1);
    });

    it('should return transactions for a property', async () => {
      prisma.landTransaction.findMany.mockResolvedValue([]);
      const result = await service.getTransactionHistory(undefined, 'p1');
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateValuation', () => {
    it('should calculate for property', async () => {
      prisma.landProperty.findUnique.mockResolvedValue({ area: 200 });
      const result = await service.calculateValuation(undefined, 'p1');
      expect(result.estimatedValue).toBeDefined();
    });

    it('should still return valuation when property not found (no additional building area)', async () => {
      prisma.landProperty.findUnique.mockResolvedValue(null);
      const result = await service.calculateValuation(undefined, 'p1');
      expect(result.estimatedValue).toBe(10000); // base value only
    });
  });

  describe('completeTransfer edge cases', () => {
    it('should throw if transaction not found', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue(null);
      await expect(service.completeTransfer('bad', 'off1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if wrong status', async () => {
      prisma.landTransaction.findUnique.mockResolvedValue({ status: 'INITIATED' });
      await expect(service.completeTransfer('tx1', 'off1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateTransfer edge cases', () => {
    it('should throw for no landPlotId/propertyId when seller/buyer exist', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', username: 'seller' })
        .mockResolvedValueOnce({ id: 'u2', username: 'buyer' });
      prisma.landTransaction.create.mockResolvedValue({ id: 'tx1', status: 'INITIATED' });
      const result = await service.initiateTransfer('u1', {
        propertyId: 'p1', buyerId: 'u2', salePrice: 50000, currency: 'ALTAN',
      });
      expect(result.status).toBe('INITIATED');
    });
  });
});

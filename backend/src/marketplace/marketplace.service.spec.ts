import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      marketplaceListing: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
      },
      marketplacePurchase: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  describe('createListing', () => {
    it('should create listing', async () => {
      prisma.marketplaceListing.create.mockResolvedValue({
        id: 'lst-1', title: 'Widget', status: 'ACTIVE',
      });
      const result = await service.createListing({
        sellerId: 'u1', categoryId: 1, listingType: 'PRODUCT' as any,
        title: 'Widget', description: 'A widget', price: '100',
      });
      expect(result.id).toBe('lst-1');
    });
  });

  describe('getListing', () => {
    it('should throw NotFoundException when missing', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(service.getListing('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return listing', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        id: 'lst-1', title: 'Widget', reviewCount: 2, totalRating: 8, purchases: [],
      });
      const result = await service.getListing('lst-1');
      expect(result.id).toBe('lst-1');
      expect(result.averageRating).toBe('4.00');
    });
  });

  describe('updateListing', () => {
    it('should reject if listing not found', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(
        service.updateListing('bad', 'u1', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if not the seller', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({ id: 'lst-1', sellerId: 'other' });
      await expect(
        service.updateListing('lst-1', 'u1', { title: 'New' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update listing', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({ id: 'lst-1', sellerId: 'u1' });
      prisma.marketplaceListing.update.mockResolvedValue({ id: 'lst-1', title: 'New' });
      const result = await service.updateListing('lst-1', 'u1', { title: 'New' });
      expect(result.title).toBe('New');
    });
  });

  describe('purchaseItem', () => {
    it('should reject inactive listing', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        id: 'lst-1', sellerId: 'other', status: 'ARCHIVED', stock: 10,
      });
      await expect(
        service.purchaseItem({ listingId: 'lst-1', buyerId: 'u1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when insufficient stock', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        id: 'lst-1', sellerId: 'other', status: 'ACTIVE', stock: 2, price: '10', sold: 0,
      });
      await expect(
        service.purchaseItem({ listingId: 'lst-1', buyerId: 'u1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create purchase', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        id: 'lst-1', sellerId: 'other', status: 'ACTIVE', stock: 10, price: '50', sold: 0,
      });
      prisma.marketplacePurchase.create.mockResolvedValue({
        id: 'p1', totalPrice: '50',
      });
      const result = await service.purchaseItem({
        listingId: 'lst-1', buyerId: 'u1', quantity: 1,
      });
      expect(result.id).toBe('p1');
    });
  });

  describe('rateTransaction', () => {
    it('should reject if not buyer', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'p1', buyerId: 'other', status: 'COMPLETED', listing: {},
      });
      await expect(
        service.rateTransaction({ purchaseId: 'p1', buyerId: 'u1', rating: 4 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid rating', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'p1', buyerId: 'u1', status: 'COMPLETED', rating: null, listing: {},
      });
      await expect(
        service.rateTransaction({ purchaseId: 'p1', buyerId: 'u1', rating: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate rating', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'p1', buyerId: 'u1', status: 'COMPLETED', rating: 4, listing: {},
      });
      await expect(
        service.rateTransaction({ purchaseId: 'p1', buyerId: 'u1', rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return marketplace statistics', async () => {
      prisma.marketplacePurchase.findMany.mockResolvedValue([]);
      const result = await service.getStats();
      expect(result).toHaveProperty('totalListings');
      expect(result).toHaveProperty('totalPurchases');
    });
  });

  describe('searchListings', () => {
    it('should search with text query', async () => {
      await service.searchListings('widget');
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalled();
    });
  });
});

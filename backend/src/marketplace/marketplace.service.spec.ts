import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let prisma: any;

  const mockListing = {
    id: 'l1', sellerId: 's1', categoryId: 1, listingType: 'PRODUCT',
    title: 'Test Item', description: 'Desc', images: [], price: '100',
    stock: 10, sold: 2, status: 'ACTIVE', totalRating: 15, reviewCount: 3,
    createdAt: new Date(), updatedAt: new Date(),
    purchases: [], _count: { purchases: 5 },
  };

  const mockPurchase = {
    id: 'p1', listingId: 'l1', buyerId: 'b1', quantity: 1,
    totalPrice: '100', status: 'PENDING', shippingAddress: 'addr',
    txHash: null, escrowId: null, trackingInfo: null,
    rating: null, review: null, paidAt: null, shippedAt: null,
    deliveredAt: null, completedAt: null, createdAt: new Date(),
    listing: mockListing,
  };

  beforeEach(async () => {
    const mockPrisma = {
      marketplaceListing: {
        create: jest.fn().mockResolvedValue(mockListing),
        findUnique: jest.fn().mockResolvedValue(mockListing),
        findMany: jest.fn().mockResolvedValue([mockListing]),
        update: jest.fn().mockResolvedValue(mockListing),
        count: jest.fn().mockResolvedValue(5),
      },
      marketplacePurchase: {
        create: jest.fn().mockResolvedValue(mockPurchase),
        findUnique: jest.fn().mockResolvedValue(mockPurchase),
        findMany: jest.fn().mockResolvedValue([mockPurchase]),
        update: jest.fn().mockResolvedValue(mockPurchase),
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(MarketplaceService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createListing', () => {
    it('creates listing', async () => {
      const r = await service.createListing({
        sellerId: 's1', categoryId: 1, listingType: 'PRODUCT' as any,
        title: 'Test', description: 'Desc', price: '100',
      });
      expect(r.id).toBe('l1');
    });
    it('creates with images and stock', async () => {
      await service.createListing({
        sellerId: 's1', categoryId: 1, listingType: 'SERVICE' as any,
        title: 'Test', description: 'Desc', price: '50',
        images: ['img1.jpg'], stock: 5,
      });
      expect(prisma.marketplaceListing.create).toHaveBeenCalled();
    });
  });

  describe('getListing', () => {
    it('returns listing with avg rating', async () => {
      const r = await service.getListing('l1');
      expect(r.averageRating).toBe('5.00');
    });
    it('returns 0 rating when no reviews', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        ...mockListing, totalRating: 0, reviewCount: 0,
      });
      const r = await service.getListing('l1');
      expect(r.averageRating).toBe('0.00');
    });
    it('throws when not found', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(service.getListing('bad')).rejects.toThrow('not found');
    });
  });

  describe('getAllListings', () => {
    it('returns all listings', async () => {
      const r = await service.getAllListings();
      expect(r).toHaveLength(1);
      expect(r[0].averageRating).toBe('5.00');
      expect(r[0].totalPurchases).toBe(5);
    });
    it('applies category filter', async () => {
      await service.getAllListings({ categoryId: 1 });
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalled();
    });
    it('applies type filter', async () => {
      await service.getAllListings({ listingType: 'SERVICE' as any });
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalled();
    });
    it('applies status filter', async () => {
      await service.getAllListings({ status: 'ACTIVE' as any });
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalled();
    });
    it('applies seller filter', async () => {
      await service.getAllListings({ sellerId: 's1' });
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalled();
    });
    it('applies search filter', async () => {
      await service.getAllListings({ search: 'test' });
      expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'test', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getMyListings', () => {
    it('returns seller listings', async () => {
      const r = await service.getMyListings('s1');
      expect(r).toHaveLength(1);
    });
  });

  describe('updateListing', () => {
    it('updates listing', async () => {
      const r = await service.updateListing('l1', 's1', { title: 'New' });
      expect(r).toBeDefined();
    });
    it('throws when not found', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(service.updateListing('bad', 's1', {})).rejects.toThrow('not found');
    });
    it('throws when not owner', async () => {
      await expect(service.updateListing('l1', 'other', {})).rejects.toThrow('Not authorized');
    });
  });

  describe('deleteListing', () => {
    it('archives listing', async () => {
      await service.deleteListing('l1', 's1');
      expect(prisma.marketplaceListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ARCHIVED' },
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(service.deleteListing('bad', 's1')).rejects.toThrow('not found');
    });
    it('throws when not owner', async () => {
      await expect(service.deleteListing('l1', 'other')).rejects.toThrow('Not authorized');
    });
  });

  describe('purchaseItem', () => {
    it('creates purchase', async () => {
      const r = await service.purchaseItem({
        listingId: 'l1', buyerId: 'b1', quantity: 1,
      });
      expect(r.id).toBe('p1');
      expect(prisma.marketplaceListing.update).toHaveBeenCalled();
    });
    it('throws when listing not found', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue(null);
      await expect(service.purchaseItem({
        listingId: 'bad', buyerId: 'b1', quantity: 1,
      })).rejects.toThrow('not found');
    });
    it('throws when listing not active', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        ...mockListing, status: 'ARCHIVED',
      });
      await expect(service.purchaseItem({
        listingId: 'l1', buyerId: 'b1', quantity: 1,
      })).rejects.toThrow('not active');
    });
    it('throws when insufficient stock', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        ...mockListing, stock: 2,
      });
      await expect(service.purchaseItem({
        listingId: 'l1', buyerId: 'b1', quantity: 5,
      })).rejects.toThrow('Insufficient stock');
    });
    it('allows purchase when stock is 0 (unlimited)', async () => {
      prisma.marketplaceListing.findUnique.mockResolvedValue({
        ...mockListing, stock: 0,
      });
      const r = await service.purchaseItem({
        listingId: 'l1', buyerId: 'b1', quantity: 1,
      });
      expect(r).toBeDefined();
    });
  });

  describe('markAsPaid', () => {
    it('marks purchase as paid', async () => {
      await service.markAsPaid('p1', '0xhash', 'escrow1');
      expect(prisma.marketplacePurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID', txHash: '0xhash' }),
        }),
      );
    });
  });

  describe('shipItem', () => {
    it('ships item', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'PAID', listing: { sellerId: 's1' },
      });
      await service.shipItem('p1', 's1', 'TRACK123');
      expect(prisma.marketplacePurchase.update).toHaveBeenCalled();
    });
    it('throws when not found', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue(null);
      await expect(service.shipItem('bad', 's1')).rejects.toThrow('not found');
    });
    it('throws when not seller', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'PAID', listing: { sellerId: 'other' },
      });
      await expect(service.shipItem('p1', 's1')).rejects.toThrow('Not authorized');
    });
    it('throws when not paid', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'PENDING', listing: { sellerId: 's1' },
      });
      await expect(service.shipItem('p1', 's1')).rejects.toThrow('not paid');
    });
  });

  describe('confirmDelivery', () => {
    it('confirms delivery', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'SHIPPED', buyerId: 'b1',
      });
      await service.confirmDelivery({ purchaseId: 'p1', buyerId: 'b1' });
      expect(prisma.marketplacePurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DELIVERED' }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue(null);
      await expect(service.confirmDelivery({
        purchaseId: 'bad', buyerId: 'b1',
      })).rejects.toThrow('not found');
    });
    it('throws when not buyer', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'SHIPPED', buyerId: 'other',
      });
      await expect(service.confirmDelivery({
        purchaseId: 'p1', buyerId: 'b1',
      })).rejects.toThrow('Not authorized');
    });
    it('throws when not shipped', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'PAID', buyerId: 'b1',
      });
      await expect(service.confirmDelivery({
        purchaseId: 'p1', buyerId: 'b1',
      })).rejects.toThrow('not shipped');
    });
  });

  describe('completePurchase', () => {
    it('completes purchase', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'DELIVERED', buyerId: 'b1',
      });
      await service.completePurchase('p1', 'b1');
      expect(prisma.marketplacePurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue(null);
      await expect(service.completePurchase('bad', 'b1')).rejects.toThrow('not found');
    });
    it('throws when not buyer', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'DELIVERED', buyerId: 'other',
      });
      await expect(service.completePurchase('p1', 'b1')).rejects.toThrow('Not authorized');
    });
    it('throws when not delivered', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'SHIPPED', buyerId: 'b1',
      });
      await expect(service.completePurchase('p1', 'b1')).rejects.toThrow('not delivered');
    });
  });

  describe('rateTransaction', () => {
    it('rates a completed purchase', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'COMPLETED', buyerId: 'b1', rating: null,
        listing: { id: 'l1' },
      });
      await service.rateTransaction({ purchaseId: 'p1', buyerId: 'b1', rating: 5, review: 'Great' });
      expect(prisma.marketplacePurchase.update).toHaveBeenCalled();
      expect(prisma.marketplaceListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalRating: { increment: 5 } }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue(null);
      await expect(service.rateTransaction({
        purchaseId: 'bad', buyerId: 'b1', rating: 5,
      })).rejects.toThrow('not found');
    });
    it('throws when not buyer', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'COMPLETED', buyerId: 'other',
      });
      await expect(service.rateTransaction({
        purchaseId: 'p1', buyerId: 'b1', rating: 5,
      })).rejects.toThrow('Not authorized');
    });
    it('throws when not completed', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'SHIPPED', buyerId: 'b1',
      });
      await expect(service.rateTransaction({
        purchaseId: 'p1', buyerId: 'b1', rating: 5,
      })).rejects.toThrow('not completed');
    });
    it('throws when already rated', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'COMPLETED', buyerId: 'b1', rating: 4,
      });
      await expect(service.rateTransaction({
        purchaseId: 'p1', buyerId: 'b1', rating: 5,
      })).rejects.toThrow('Already rated');
    });
    it('throws when rating out of range', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        ...mockPurchase, status: 'COMPLETED', buyerId: 'b1', rating: null,
      });
      await expect(service.rateTransaction({
        purchaseId: 'p1', buyerId: 'b1', rating: 6,
      })).rejects.toThrow('between 1 and 5');
    });
  });

  describe('getMyPurchases', () => {
    it('returns buyer purchases', async () => {
      const r = await service.getMyPurchases('b1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getMySales', () => {
    it('returns seller sales', async () => {
      const r = await service.getMySales('s1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('returns marketplace stats', async () => {
      prisma.marketplacePurchase.findMany.mockResolvedValue([
        { totalPrice: '100' }, { totalPrice: '200' },
      ]);
      const r = await service.getStats();
      expect(r.totalListings).toBe(5);
      expect(r.activeListings).toBe(5);
      expect(r.totalPurchases).toBe(3);
      expect(r.completedPurchases).toBe(3);
      expect(r.totalVolume).toBe('300.00');
    });
  });

  describe('searchListings', () => {
    it('searches listings', async () => {
      const r = await service.searchListings('test');
      expect(r).toHaveLength(1);
    });
  });
});

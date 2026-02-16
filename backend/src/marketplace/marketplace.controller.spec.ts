import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createListing: jest.fn().mockResolvedValue({ id: 'l1' }),
      getAllListings: jest.fn().mockResolvedValue([]),
      getListing: jest.fn().mockResolvedValue({ id: 'l1' }),
      updateListing: jest.fn().mockResolvedValue({ updated: true }),
      deleteListing: jest.fn().mockResolvedValue({ deleted: true }),
      getMyListings: jest.fn().mockResolvedValue([]),
      purchaseItem: jest.fn().mockResolvedValue({ id: 'p1' }),
      shipItem: jest.fn().mockResolvedValue({ shipped: true }),
      confirmDelivery: jest.fn().mockResolvedValue({ delivered: true }),
      completePurchase: jest.fn().mockResolvedValue({ completed: true }),
      rateTransaction: jest.fn().mockResolvedValue({ rated: true }),
      getMyPurchases: jest.fn().mockResolvedValue([]),
      getMySales: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ total: 10 }),
      searchListings: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [{ provide: MarketplaceService, useValue: mockService }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(MarketplaceController);
    service = module.get(MarketplaceService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('createListing', async () => {
    const r = await controller.createListing(req, { categoryId: '1', listingType: 'PRODUCT', title: 'T', description: 'D', price: 100 });
    expect(r.success).toBe(true);
    expect(service.createListing).toHaveBeenCalledWith(expect.objectContaining({ sellerId: 'u1', categoryId: 1 }));
  });
  it('createListing with images & stock', async () => {
    await controller.createListing(req, { categoryId: '1', listingType: 'PRODUCT', title: 'T', description: 'D', price: 100, images: ['i1'], stock: '5' });
    expect(service.createListing).toHaveBeenCalledWith(expect.objectContaining({ images: ['i1'], stock: 5 }));
  });

  it('getAllListings no filters', async () => {
    const r = await controller.getAllListings();
    expect(r.success).toBe(true);
    expect(service.getAllListings).toHaveBeenCalledWith({});
  });
  it('getAllListings with filters', async () => {
    await controller.getAllListings('1', 'PRODUCT', 'ACTIVE', 'u1', 'test');
    expect(service.getAllListings).toHaveBeenCalledWith({ categoryId: 1, listingType: 'PRODUCT', status: 'ACTIVE', sellerId: 'u1', search: 'test' });
  });

  it('getListing', async () => { const r = await controller.getListing('l1'); expect(r.success).toBe(true); });

  it('updateListing', async () => {
    const r = await controller.updateListing(req, 'l1', { title: 'T', price: 50, stock: '3' });
    expect(r.success).toBe(true);
    expect(service.updateListing).toHaveBeenCalledWith('l1', 'u1', expect.objectContaining({ stock: 3 }));
  });
  it('updateListing no stock', async () => {
    await controller.updateListing(req, 'l1', { title: 'T' });
    expect(service.updateListing).toHaveBeenCalledWith('l1', 'u1', expect.objectContaining({ stock: undefined }));
  });

  it('deleteListing', async () => { const r = await controller.deleteListing(req, 'l1'); expect(r.success).toBe(true); });
  it('getMyListings', async () => { const r = await controller.getMyListings(req); expect(r.success).toBe(true); });

  it('purchaseItem', async () => {
    const r = await controller.purchaseItem(req, { listingId: 'l1', quantity: '2', shippingAddress: 'addr' });
    expect(r.success).toBe(true);
    expect(service.purchaseItem).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 'u1', quantity: 2 }));
  });

  it('shipItem', async () => { const r = await controller.shipItem(req, 'p1', { trackingInfo: 'TR123' }); expect(r.success).toBe(true); });
  it('confirmDelivery', async () => { const r = await controller.confirmDelivery(req, 'p1'); expect(r.success).toBe(true); });
  it('completePurchase', async () => { const r = await controller.completePurchase(req, 'p1'); expect(r.success).toBe(true); });

  it('rateTransaction', async () => {
    const r = await controller.rateTransaction(req, 'p1', { rating: '5', review: 'great' });
    expect(r.success).toBe(true);
    expect(service.rateTransaction).toHaveBeenCalledWith(expect.objectContaining({ rating: 5 }));
  });

  it('getMyPurchases', async () => { const r = await controller.getMyPurchases(req); expect(r.success).toBe(true); });
  it('getMySales', async () => { const r = await controller.getMySales(req); expect(r.success).toBe(true); });
  it('getStats', async () => { const r = await controller.getStats(); expect(r.success).toBe(true); });
  it('search', async () => { const r = await controller.search('query'); expect(r.success).toBe(true); });
});

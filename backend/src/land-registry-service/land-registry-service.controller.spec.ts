import { Test, TestingModule } from '@nestjs/testing';
import { LandRegistryServiceController } from './land-registry-service.controller';
import { LandRegistryServiceService } from './land-registry-service.service';

describe('LandRegistryServiceController', () => {
  let controller: LandRegistryServiceController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      registerLandPlot: jest.fn().mockResolvedValue({ cadastralNumber: 'MO-GO-1' }),
      getLandPlotByCadastral: jest.fn().mockResolvedValue({ id: '1' }),
      searchLandPlots: jest.fn().mockResolvedValue([]),
      searchLandPlotsByGPS: jest.fn().mockResolvedValue([]),
      getMyOwnerships: jest.fn().mockResolvedValue([]),
      registerOwnership: jest.fn().mockResolvedValue({ id: 'o1' }),
      getMyLeases: jest.fn().mockResolvedValue([]),
      registerLease: jest.fn().mockResolvedValue({ id: 'l1' }),
      getTransactionHistory: jest.fn().mockResolvedValue([]),
      initiateTransfer: jest.fn().mockResolvedValue({ id: 'tx1' }),
      confirmPayment: jest.fn().mockResolvedValue({ status: 'PAYMENT_CONFIRMED' }),
      completeTransfer: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
      calculateValuation: jest.fn().mockResolvedValue({ estimatedValue: 50000 }),
      getMarketTrends: jest.fn().mockResolvedValue({ trend: 'STABLE' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandRegistryServiceController],
      providers: [{ provide: LandRegistryServiceService, useValue: mockService }],
    }).compile();
    controller = module.get(LandRegistryServiceController);
    service = module.get(LandRegistryServiceService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('registerLandPlot', async () => { await controller.registerLandPlot(req, { region: 'MO' }); expect(service.registerLandPlot).toHaveBeenCalledWith('u1', { region: 'MO' }); });
  it('getLandPlot', async () => { await controller.getLandPlot('MO-1'); expect(service.getLandPlotByCadastral).toHaveBeenCalledWith('MO-1'); });
  it('searchLandPlots', async () => { await controller.searchLandPlots('MO'); expect(service.searchLandPlots).toHaveBeenCalled(); });
  it('searchByGPS', async () => { await controller.searchByGPS({ northEast: {}, southWest: {} }); expect(service.searchLandPlotsByGPS).toHaveBeenCalled(); });
  it('getMyOwnerships', async () => { await controller.getMyOwnerships(req); expect(service.getMyOwnerships).toHaveBeenCalledWith('u1'); });
  it('registerOwnership', async () => { await controller.registerOwnership(req, {}); expect(service.registerOwnership).toHaveBeenCalledWith('u1', {}); });
  it('getMyLeases', async () => { await controller.getMyLeases(req); expect(service.getMyLeases).toHaveBeenCalledWith('u1'); });
  it('registerLease', async () => { await controller.registerLease({}); expect(service.registerLease).toHaveBeenCalled(); });
  it('getTransactions', async () => { await controller.getTransactions('p1'); expect(service.getTransactionHistory).toHaveBeenCalledWith('p1', undefined); });
  it('initiateTransfer', async () => { await controller.initiateTransfer(req, {}); expect(service.initiateTransfer).toHaveBeenCalledWith('u1', {}); });
  it('confirmPayment', async () => { await controller.confirmPayment('tx1', { paymentTxHash: '0x' }); expect(service.confirmPayment).toHaveBeenCalledWith('tx1', '0x'); });
  it('completeTransfer', async () => { await controller.completeTransfer(req, 'tx1', {}); expect(service.completeTransfer).toHaveBeenCalledWith('tx1', 'u1', undefined); });
  it('calculateValuation', async () => { await controller.calculateValuation({ landPlotId: 'p1' }); expect(service.calculateValuation).toHaveBeenCalledWith('p1', undefined); });
  it('getMarketTrends', async () => { await controller.getMarketTrends('MO'); expect(service.getMarketTrends).toHaveBeenCalledWith('MO'); });
});

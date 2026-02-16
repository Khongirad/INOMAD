import { Test, TestingModule } from '@nestjs/testing';
import { MigrationServiceController } from './migration-service.controller';
import { MigrationServiceService } from './migration-service.service';

describe('MigrationServiceController', () => {
  let controller: MigrationServiceController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createApplication: jest.fn().mockResolvedValue({ id: 'app1' }),
      submitApplication: jest.fn().mockResolvedValue({ submitted: true }),
      getMyApplications: jest.fn().mockResolvedValue([]),
      getApplicationById: jest.fn().mockResolvedValue({ id: 'app1' }),
      getDocuments: jest.fn().mockResolvedValue([]),
      uploadDocument: jest.fn().mockResolvedValue({ id: 'doc1' }),
      lookupPassport: jest.fn().mockResolvedValue({ found: true }),
      getAllApplications: jest.fn().mockResolvedValue([]),
      reviewApplication: jest.fn().mockResolvedValue({ reviewed: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigrationServiceController],
      providers: [{ provide: MigrationServiceService, useValue: mockService }],
    }).compile();
    controller = module.get(MigrationServiceController);
    service = module.get(MigrationServiceService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createApplication', async () => { await controller.createApplication(req, {}); expect(service.createApplication).toHaveBeenCalledWith('u1', {}); });
  it('submitApplication', async () => { await controller.submitApplication(req, 'app1'); expect(service.submitApplication).toHaveBeenCalledWith('u1', 'app1'); });
  it('getMyApplications', async () => { await controller.getMyApplications(req); expect(service.getMyApplications).toHaveBeenCalledWith('u1'); });
  it('getApplication', async () => { await controller.getApplication('app1'); expect(service.getApplicationById).toHaveBeenCalledWith('app1'); });
  it('getDocuments', async () => { await controller.getDocuments('app1'); expect(service.getDocuments).toHaveBeenCalledWith('app1'); });
  it('uploadDocument', async () => { await controller.uploadDocument('app1', { type: 'PASSPORT', filename: 'f.jpg' }); expect(service.uploadDocument).toHaveBeenCalled(); });
  it('uploadDocument defaults', async () => { await controller.uploadDocument('app1', {}); expect(service.uploadDocument).toHaveBeenCalledWith('app1', expect.objectContaining({ type: 'OTHER', filename: 'upload' })); });
  it('lookupPassport', async () => { await controller.lookupPassport('P123'); expect(service.lookupPassport).toHaveBeenCalledWith('P123'); });
  it('getAllApplications', async () => { await controller.getAllApplications(); expect(service.getAllApplications).toHaveBeenCalled(); });
  it('reviewApplication', async () => { await controller.reviewApplication(req, 'app1', { decision: 'APPROVE' }); expect(service.reviewApplication).toHaveBeenCalledWith('app1', 'u1', { decision: 'APPROVE' }); });
});

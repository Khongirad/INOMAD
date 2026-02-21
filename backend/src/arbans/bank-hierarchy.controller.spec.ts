import { Test, TestingModule } from '@nestjs/testing';
import { BankHierarchyController } from './bank-hierarchy.controller';
import { BankHierarchyService } from './bank-hierarchy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('BankHierarchyController', () => {
  let controller: BankHierarchyController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      registerEmployee: jest.fn().mockResolvedValue('emp-1'),
      getEmployee: jest.fn().mockResolvedValue({ id: 'emp-1', seatId: 1 }),
      getHierarchyPath: jest.fn().mockResolvedValue([{ level: 0, role: 'CLERK' }]),
      updatePerformance: jest.fn().mockResolvedValue(undefined),
      canBePromoted: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankHierarchyController],
      providers: [{ provide: BankHierarchyService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(BankHierarchyController);
    service = module.get(BankHierarchyService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('registers employee', async () => {
    const r = await controller.registerEmployee({ seatId: 1, wallet: '0xABC', bankArbadId: 1 });
    expect(r.success).toBe(true);
    expect(r.employeeId).toBe('emp-1');
  });

  it('handles registration error', async () => {
    service.registerEmployee.mockRejectedValue(new Error('duplicate'));
    await expect(controller.registerEmployee({ seatId: 1, wallet: '0x', bankArbadId: 1 }))
      .rejects.toThrow();
  });

  it('gets employee by seat', async () => {
    const r = await controller.getEmployeeBySeat('1');
    expect(r.success).toBe(true);
  });

  it('gets employee by id', async () => {
    const r = await controller.getEmployee('1');
    expect(r.success).toBe(true);
    expect(r.employee).toBeDefined();
  });

  it('handles get employee error', async () => {
    service.getEmployee.mockRejectedValue(new Error('not found'));
    await expect(controller.getEmployee('999')).rejects.toThrow();
  });

  it('gets hierarchy path', async () => {
    const r = await controller.getHierarchyPath('1');
    expect(r.success).toBe(true);
    expect(r.path).toBeDefined();
  });

  it('handles hierarchy path error', async () => {
    service.getHierarchyPath.mockRejectedValue(new Error('fail'));
    await expect(controller.getHierarchyPath('999')).rejects.toThrow();
  });

  it('updates performance', async () => {
    const r = await controller.updatePerformance('1', { score: 85 });
    expect(r.success).toBe(true);
    expect(r.newScore).toBe(85);
  });

  it('rejects invalid performance score', async () => {
    await expect(controller.updatePerformance('1', { score: 150 })).rejects.toThrow();
  });

  it('checks promotion', async () => {
    const r = await controller.checkPromotion('1');
    expect(r.success).toBe(true);
    expect(r.canBePromoted).toBe(true);
  });

  it('handles promotion check error', async () => {
    service.canBePromoted.mockRejectedValue(new Error('fail'));
    await expect(controller.checkPromotion('999')).rejects.toThrow();
  });
});

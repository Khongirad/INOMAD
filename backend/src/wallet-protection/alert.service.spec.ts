import { AlertService } from './alert.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get<AlertService>(AlertService);
  });

  it('sendHighRiskAlert completes', async () => {
    await expect(service.sendHighRiskAlert('0x123', 90, ['draining'])).resolves.not.toThrow();
  });

  it('sendMediumRiskAlert completes', async () => {
    await expect(service.sendMediumRiskAlert('0x123', 60, ['frequency'])).resolves.not.toThrow();
  });

  it('sendLowRiskAlert completes', async () => {
    await expect(service.sendLowRiskAlert('0x123', 35, ['new recipient'])).resolves.not.toThrow();
  });

  it('getStats returns object', () => {
    expect(service.getStats()).toBeDefined();
  });
});

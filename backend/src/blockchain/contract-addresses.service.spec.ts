import { Test, TestingModule } from '@nestjs/testing';
import { ContractAddressesService } from './contract-addresses.service';
import { ConfigService } from '@nestjs/config';

describe('ContractAddressesService', () => {
  let service: ContractAddressesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractAddressesService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get<ContractAddressesService>(ContractAddressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

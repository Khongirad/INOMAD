import { Test, TestingModule } from '@nestjs/testing';
import { VotingCenterService } from './voting-center.service';
import { ConfigService } from '@nestjs/config';

describe('VotingCenterService', () => {
  let service: VotingCenterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotingCenterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BLOCKCHAIN_RPC_URL') return 'http://localhost:8545';
              if (key === 'VOTING_CENTER_ADDRESS') return '0x' + '1'.repeat(40);
              return null;
            }),
          },
        },
      ],
    }).compile();
    service = module.get<VotingCenterService>(VotingCenterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

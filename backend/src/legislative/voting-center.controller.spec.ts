import { Test, TestingModule } from '@nestjs/testing';
import { VotingCenterController } from './voting-center.controller';
import { VotingCenterService } from './voting-center.service';
import { ConfigService } from '@nestjs/config';


describe('VotingCenterController', () => {
  let controller: VotingCenterController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VotingCenterController],
      providers: [
        { provide: VotingCenterService, useValue: { createProposal: jest.fn(), getProposal: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })

    .compile();
    controller = module.get<VotingCenterController>(VotingCenterController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});

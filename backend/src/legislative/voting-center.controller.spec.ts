import { Test, TestingModule } from '@nestjs/testing';
import { VotingCenterController } from './voting-center.controller';
import { VotingCenterService } from './voting-center.service';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: { Wallet: jest.fn().mockImplementation((pk) => ({ address: '0x123', privateKey: pk })) },
}));

describe('VotingCenterController', () => {
  let controller: VotingCenterController;
  let service: any;
  const req = { user: { sub: 'u1' }, query: { level: '2' } };

  beforeEach(async () => {
    const mockService = {
      createProposal: jest.fn().mockResolvedValue({ id: 1 }),
      getProposal: jest.fn().mockResolvedValue({ id: 1, results: { for: 5, against: 2 } }),
      getProposalsByLevel: jest.fn().mockResolvedValue([1, 2]),
      vote: jest.fn().mockResolvedValue({ voted: true }),
      finalizeProposal: jest.fn().mockResolvedValue({ finalized: true }),
      hasVoted: jest.fn().mockResolvedValue(true),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VotingCenterController],
      providers: [{ provide: VotingCenterService, useValue: mockService }],
    }).compile();
    controller = module.get(VotingCenterController);
    service = module.get(VotingCenterService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('createProposal success', async () => {
    const body = { proposalType: 1, khuralLevel: 1, khuralId: 1, title: 'T', description: 'D', votingPeriod: 7, privateKey: '0xPK' };
    const r = await controller.createProposal(req, body);
    expect(r.success).toBe(true);
    expect(service.createProposal).toHaveBeenCalled();
  });
  it('createProposal error', async () => {
    service.createProposal.mockRejectedValue(new Error('fail'));
    await expect(controller.createProposal(req, { privateKey: '0xPK' } as any)).rejects.toThrow('fail');
  });

  it('getProposal success', async () => {
    const r = await controller.getProposal('1');
    expect(r.success).toBe(true);
  });
  it('getProposal error', async () => {
    service.getProposal.mockRejectedValue(new Error('nf'));
    await expect(controller.getProposal('1')).rejects.toThrow('nf');
  });

  it('getProposalsByLevel', async () => {
    const r = await controller.getProposalsByLevel(req);
    expect(r.success).toBe(true);
    expect(service.getProposalsByLevel).toHaveBeenCalledWith(2);
  });
  it('getProposalsByLevel default level', async () => {
    const r = await controller.getProposalsByLevel({ query: {} } as any);
    expect(service.getProposalsByLevel).toHaveBeenCalledWith(1);
  });
  it('getProposalsByLevel error', async () => {
    service.getProposalsByLevel.mockRejectedValue(new Error('err'));
    await expect(controller.getProposalsByLevel(req)).rejects.toThrow('err');
  });

  it('vote success', async () => {
    const r = await controller.vote('1', { support: true, privateKey: '0xPK' });
    expect(r.success).toBe(true);
  });
  it('vote error', async () => {
    service.vote.mockRejectedValue(new Error('err'));
    await expect(controller.vote('1', { support: true, privateKey: '0xPK' })).rejects.toThrow('err');
  });

  it('finalizeProposal success', async () => {
    const r = await controller.finalizeProposal('1', { privateKey: '0xPK' });
    expect(r.success).toBe(true);
  });
  it('finalizeProposal error', async () => {
    service.finalizeProposal.mockRejectedValue(new Error('err'));
    await expect(controller.finalizeProposal('1', { privateKey: '0xPK' })).rejects.toThrow('err');
  });

  it('getResults success', async () => {
    const r = await controller.getResults('1');
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ for: 5, against: 2 });
  });
  it('getResults error', async () => {
    service.getProposal.mockRejectedValue(new Error('err'));
    await expect(controller.getResults('1')).rejects.toThrow('err');
  });

  it('hasVoted success', async () => {
    const r = await controller.hasVoted('1', '0xABC');
    expect(r.success).toBe(true);
    expect(r.data.hasVoted).toBe(true);
  });
  it('hasVoted error', async () => {
    service.hasVoted.mockRejectedValue(new Error('err'));
    await expect(controller.hasVoted('1', '0xABC')).rejects.toThrow('err');
  });
});

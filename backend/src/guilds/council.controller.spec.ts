import { Test, TestingModule } from '@nestjs/testing';
import { CouncilController } from './council.controller';
import { CouncilService } from './council.service';

describe('CouncilController', () => {
  let controller: CouncilController;
  const mockService = {
    getCouncilMembers: jest.fn().mockResolvedValue([{ userId: 'u1', role: 'ELDER' }]),
    proposeVersion: jest.fn().mockResolvedValue({ id: 'v1', title: 'Edit Proposal' }),
    castVote: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CouncilController],
      providers: [{ provide: CouncilService, useValue: mockService }],
    }).compile();
    controller = module.get(CouncilController);
  });

  const req = { user: { id: 'u1' } } as any;

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets council members without guildId', async () => {
    const r = await controller.getCouncil();
    expect(r).toHaveLength(1);
    expect(mockService.getCouncilMembers).toHaveBeenCalledWith(undefined);
  });

  it('gets council members with guildId', async () => {
    await controller.getCouncil('g1');
    expect(mockService.getCouncilMembers).toHaveBeenCalledWith('g1');
  });

  it('proposes edit', async () => {
    const r = await controller.proposeEdit(req, { eventId: 'e1', title: 'New Title', description: 'Desc' });
    expect(r.id).toBe('v1');
    expect(mockService.proposeVersion).toHaveBeenCalledWith('e1', 'New Title', 'Desc', 'u1');
  });

  it('casts vote', async () => {
    const r = await controller.vote(req, { versionId: 'v1', vote: true });
    expect(mockService.castVote).toHaveBeenCalledWith('v1', 'u1', true);
  });
});

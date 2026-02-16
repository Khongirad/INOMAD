import { Test, TestingModule } from '@nestjs/testing';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';

describe('GuildsController', () => {
  let controller: GuildsController;
  const mockService = {
    createGuild: jest.fn().mockResolvedValue({ id: 'g1', name: 'Builders' }),
    listGuilds: jest.fn().mockResolvedValue([{ id: 'g1' }]),
    getGuild: jest.fn().mockResolvedValue({ id: 'g1', name: 'Builders' }),
    joinGuild: jest.fn().mockResolvedValue({ success: true }),
    getGuildMembers: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GuildsController],
      providers: [{ provide: GuildsService, useValue: mockService }],
    }).compile();
    controller = module.get(GuildsController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates guild', async () => {
    const r = await controller.createGuild({ name: 'Builders', type: 'CRAFT' } as any);
    expect(r.id).toBe('g1');
  });

  it('lists guilds without filter', async () => {
    const r = await controller.listGuilds();
    expect(r).toHaveLength(1);
  });

  it('lists guilds with type filter', async () => {
    await controller.listGuilds('CRAFT');
    expect(mockService.listGuilds).toHaveBeenCalledWith('CRAFT');
  });

  it('gets guild', async () => {
    const r = await controller.getGuild('g1');
    expect(r.name).toBe('Builders');
  });

  it('joins guild', async () => {
    const r = await controller.joinGuild('g1', { user: { id: 'u1' } } as any);
    expect(r).toBeDefined();
  });

  it('gets guild members', async () => {
    const r = await controller.getGuildMembers('g1');
    expect(r).toHaveLength(1);
  });
});

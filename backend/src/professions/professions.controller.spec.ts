import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionsController } from './professions.controller';
import { ProfessionsService } from './professions.service';

describe('ProfessionsController', () => {
  let controller: ProfessionsController;
  const mockService = {
    createProfession: jest.fn().mockResolvedValue({ id: 'p1', name: 'Engineer' }),
    listProfessions: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
    getProfession: jest.fn().mockResolvedValue({ id: 'p1', name: 'Engineer' }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfessionsController],
      providers: [{ provide: ProfessionsService, useValue: mockService }],
    }).compile();
    controller = module.get(ProfessionsController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates profession', async () => {
    const r = await controller.createProfession({ name: 'Engineer' } as any);
    expect(r.id).toBe('p1');
  });

  it('lists professions', async () => {
    const r = await controller.listProfessions();
    expect(r).toHaveLength(2);
  });

  it('gets profession', async () => {
    const r = await controller.getProfession('p1');
    expect(r.name).toBe('Engineer');
  });
});

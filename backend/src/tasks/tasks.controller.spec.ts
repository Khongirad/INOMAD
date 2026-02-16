import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  const mockService = {
    createTask: jest.fn().mockResolvedValue({ id: 't1', title: 'Build' }),
    listTasks: jest.fn().mockResolvedValue([{ id: 't1' }]),
    getTask: jest.fn().mockResolvedValue({ id: 't1', title: 'Build' }),
    acceptTask: jest.fn().mockResolvedValue({ success: true }),
    completeTask: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockService }],
    }).compile();
    controller = module.get(TasksController);
  });

  const req = { user: { id: 'u1' } };

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates task', async () => {
    const r = await controller.createTask({ title: 'Build' } as any, req as any);
    expect(r.id).toBe('t1');
    expect(mockService.createTask).toHaveBeenCalledWith({ title: 'Build' }, 'u1');
  });

  it('lists tasks without filters', async () => {
    const r = await controller.listTasks();
    expect(r).toHaveLength(1);
  });

  it('lists tasks with filters', async () => {
    await controller.listTasks('OPEN', 'prof1');
    expect(mockService.listTasks).toHaveBeenCalledWith('OPEN', 'prof1');
  });

  it('gets task', async () => {
    const r = await controller.getTask('t1');
    expect(r.title).toBe('Build');
  });

  it('accepts task', async () => {
    const r = await controller.acceptTask('t1', req as any);
    expect(mockService.acceptTask).toHaveBeenCalledWith('t1', 'u1');
  });

  it('completes task', async () => {
    const r = await controller.completeTask('t1', req as any);
    expect(mockService.completeTask).toHaveBeenCalledWith('t1', 'u1');
  });
});

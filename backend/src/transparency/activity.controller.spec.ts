import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityLogService } from './activity-log.service';
import { TemplateService } from './template.service';

describe('ActivityController', () => {
  let controller: ActivityController;
  const mockActivityService = {
    logActivity: jest.fn().mockResolvedValue({ id: 'a1', actionName: 'CREATE_ORG' }),
  };
  const mockTemplateService = {
    getTemplates: jest.fn().mockResolvedValue([{ id: 't1', name: 'Template A' }]),
    validateActivity: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        { provide: ActivityLogService, useValue: mockActivityService },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();
    controller = module.get(ActivityController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('logs activity', async () => {
    const body = {
      performedByUserId: 'u1',
      actionName: 'CREATE_ORG',
      actionDescription: 'Created org',
      actionParameters: { orgId: 'o1' },
      powerBranch: 'EXECUTIVE' as any,
    };
    const r = await controller.logActivity(body);
    expect(r.actionName).toBe('CREATE_ORG');
  });

  it('gets templates without filter', async () => {
    const r = await controller.getTemplates();
    expect(r).toHaveLength(1);
    expect(mockTemplateService.getTemplates).toHaveBeenCalledWith(undefined);
  });

  it('gets templates with powerBranch filter', async () => {
    await controller.getTemplates('LEGISLATIVE' as any);
    expect(mockTemplateService.getTemplates).toHaveBeenCalledWith('LEGISLATIVE');
  });

  it('validates activity', async () => {
    const r = await controller.validateActivity({ templateId: 't1', parameters: { key: 'val' } });
    expect(r.valid).toBe(true);
    expect(mockTemplateService.validateActivity).toHaveBeenCalledWith('t1', { key: 'val' });
  });
});

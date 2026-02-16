import { Test, TestingModule } from '@nestjs/testing';
import { EducationController } from './education.controller';
import { EducationService } from './education.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('EducationController', () => {
  let controller: EducationController;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      submitEducation: jest.fn().mockResolvedValue({ id: 'e1' }),
      verifyEducation: jest.fn().mockResolvedValue({ id: 'e1', status: 'VERIFIED' }),
      rejectEducation: jest.fn().mockResolvedValue({ id: 'e1', status: 'REJECTED' }),
      getUserEducation: jest.fn().mockResolvedValue([]),
      getPendingVerifications: jest.fn().mockResolvedValue([]),
      getRecommendationsGiven: jest.fn().mockResolvedValue([]),
      getVerifiedSpecialists: jest.fn().mockResolvedValue([]),
      hasVerifiedEducation: jest.fn().mockResolvedValue(true),
    };
    const module = await Test.createTestingModule({
      controllers: [EducationController],
      providers: [{ provide: EducationService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(EducationController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('submits education', async () => {
    await controller.submitEducation(req, { type: 'UNIVERSITY' as any, institution: 'MIT', fieldOfStudy: 'CS' });
  });
  it('verifies education', async () => { await controller.verifyEducation(req, 'e1', {}); });
  it('rejects education', async () => { await controller.rejectEducation(req, 'e1'); });
  it('gets my education', async () => { await controller.getMyEducation(req); });
  it('gets user education', async () => { await controller.getUserEducation('u2'); });
  it('gets pending', async () => { await controller.getPending(); });
  it('gets recommendations given', async () => { await controller.getRecommendationsGiven(req); });
  it('gets specialists', async () => { await controller.getSpecialists('CS'); });
  it('checks education', async () => {
    const r = await controller.checkEducation('u1', 'CS');
    expect(r.hasEducation).toBe(true);
  });
});

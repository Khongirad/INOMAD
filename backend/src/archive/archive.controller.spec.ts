import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveController } from './archive.controller';
import { DocumentTemplateService } from './document-template.service';
import { DocumentContractService } from './document-contract.service';
import { NotaryService } from './notary.service';
import { LegalService } from './legal.service';
import { TemplateSeederService } from './template-seeder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorGuard } from '../auth/guards/creator.guard';

describe('ArchiveController', () => {
  let controller: ArchiveController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchiveController],
      providers: [
        { provide: DocumentTemplateService, useValue: { getTemplates: jest.fn().mockResolvedValue([]) } },
        { provide: DocumentContractService, useValue: { createContract: jest.fn() } },
        { provide: NotaryService, useValue: { notarizeDocument: jest.fn() } },
        { provide: LegalService, useValue: { certifyDocument: jest.fn() } },
        { provide: TemplateSeederService, useValue: { seedTemplates: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .overrideGuard(CreatorGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<ArchiveController>(ArchiveController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});

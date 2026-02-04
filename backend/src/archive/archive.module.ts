import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentTemplateService } from './document-template.service';
import { DocumentContractService } from './document-contract.service';
import { NotaryService } from './notary.service';
import { LegalService } from './legal.service';
import { TemplateSeederService } from './template-seeder.service';
import { ArchiveController } from './archive.controller';

/**
 * ArchiveModule
 * 
 * State Archive & Document Constructor System
 * 
 * Manages:
 * - Document templates (universal constructor)
 * - Document smart contracts (blockchain-based)
 * - Notarization system
 * - Legal certification system
 * - Document archiving
 */
@Module({
  imports: [PrismaModule],
  providers: [
    DocumentTemplateService,
    DocumentContractService,
    NotaryService,
    LegalService,
    TemplateSeederService,
  ],
  controllers: [ArchiveController],
  exports: [
    DocumentTemplateService,
    DocumentContractService,
    NotaryService,
    LegalService,
    TemplateSeederService,
  ],
})
export class ArchiveModule {}

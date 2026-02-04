import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentTemplateService } from './document-template.service';
import { DocumentContractService } from './document-contract.service';
import { NotaryService } from './notary.service';
import { LegalService } from './legal.service';
import { DocumentStage, DocumentStatus, SignerRole } from '@prisma/client';

/**
 * ArchiveController
 * 
 * API endpoints for State Archive & Document Constructor System
 */
@Controller('archive')
export class ArchiveController {
  private readonly logger = new Logger(ArchiveController.name);

  constructor(
    private templateService: DocumentTemplateService,
    private documentService: DocumentContractService,
    private notaryService: NotaryService,
    private legalService: LegalService,
  ) {}

  // ==================
  // TEMPLATE ENDPOINTS
  // ==================

  /**
   * Create a new document template
   * @access CREATOR, ARCHIVIST
   */
  @Post('templates')
  @UseGuards(JwtAuthGuard)
  async createTemplate(@Request() req, @Body() body: any) {
    return this.templateService.createTemplate(req.user.userId, body);
  }

  /**
   * List all templates
   */
  @Get('templates')
  async listTemplates(@Query('category') category?: string) {
    return this.templateService.listTemplates(category);
  }

  /**
   * Get template by code
   */
  @Get('templates/:code')
  async getTemplate(@Param('code') code: string) {
    return this.templateService.getTemplate(code);
  }

  // ====================
  // DOCUMENT ENDPOINTS
  // ====================

  /**
   * Create a new document from template
   * @access Authenticated users
   */
  @Post('documents')
  @UseGuards(JwtAuthGuard)
  async createDocument(@Request() req, @Body() body: {
    templateCode: string;
    recipientId?: string;
    title: string;
    titleRu?: string;
    variables: Record<string, any>;
    documentNumberPrefix?: string;
  }) {
    return this.documentService.createDocument({
      ...body,
      issuerId: req.user.userId,
    });
  }

  /**
   * Get document by ID
   */
  @Get('documents/:id')
  @UseGuards(JwtAuthGuard)
  async getDocument(@Param('id') id: string, @Request() req) {
    const document = await this.documentService.getDocument(id);

    // Log access
    await this.documentService.logAccess({
      documentId: id,
      userId: req.user.userId,
      action: 'VIEW',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'],
    });

    return document;
  }

  /**
   * Get document by document number
   */
  @Get('documents/by-number/:number')
  @UseGuards(JwtAuthGuard)
  async getDocumentByNumber(@Param('number') number: string, @Request() req) {
    const document = await this.documentService.getDocumentByNumber(number);

    // Log access
    await this.documentService.logAccess({
      documentId: document.id,
      userId: req.user.userId,
      action: 'VIEW',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'],
    });

    return document;
  }

  /**
   * List documents
   */
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async listDocuments(@Query() query: {
    stage?: DocumentStage;
    status?: DocumentStatus;
    category?: string;
    issuerId?: string;
    recipientId?: string;
  }) {
    return this.documentService.listDocuments(query);
  }

  /**
   * Sign a document
   */
  @Post('documents/:id/sign')
  @UseGuards(JwtAuthGuard)
  async signDocument(
    @Param('id') id: string,
    @Request() req,
    @Body() body: {
      signerRole: SignerRole;
      signature: string;
      publicKey: string;
    },
  ) {
    return this.documentService.signDocument(
      id,
      req.user.userId,
      body.signerRole,
      body.signature,
      body.publicKey,
    );
  }

  /**
   * Submit document for notarization
   */
  @Post('documents/:id/submit-notarization')
  @UseGuards(JwtAuthGuard)
  async submitForNotarization(@Param('id') id: string, @Request() req) {
    return this.documentService.submitForNotarization(id, req.user.userId);
  }

  /**
   * Submit document for legal certification
   */
  @Post('documents/:id/submit-legal')
  @UseGuards(JwtAuthGuard)
  async submitForLegal(@Param('id') id: string, @Request() req) {
    return this.documentService.submitForLegal(id, req.user.userId);
  }

  // ====================
  // NOTARY ENDPOINTS
  // ====================

  /**
   * Get pending documents for notarization
   * @access NOTARY
   */
  @Get('notary/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingNotarizations() {
    return this.notaryService.getPendingDocuments();
  }

  /**
   * Notarize a document
   * @access NOTARY
   */
  @Post('notary/notarize/:documentId')
  @UseGuards(JwtAuthGuard)
  async notarizeDocument(
    @Param('documentId') documentId: string,
    @Request() req,
    @Body() body: {
      notes?: string;
      sealImage?: string;
      signature: string;
      publicKey: string;
    },
  ) {
    return this.notaryService.notarizeDocument(documentId, req.user.userId, body);
  }

  /**
   * Get notarization record
   */
  @Get('notary/record/:documentId')
  @UseGuards(JwtAuthGuard)
  async getNotarization(@Param('documentId') documentId: string) {
    return this.notaryService.getNotarization(documentId);
  }

  /**
   * Get notary's records
   */
  @Get('notary/my-records')
  @UseGuards(JwtAuthGuard)
  async getMyNotaryRecords(@Request() req) {
    return this.notaryService.getNotaryRecords(req.user.userId);
  }

  /**
   * Get notarial registry
   */
  @Get('notary/registry')
  async getNotarialRegistry(
    @Query('notaryId') notaryId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.notaryService.getRegistry({
      notaryId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  // ===================
  // LEGAL ENDPOINTS
  // ===================

  /**
   * Get pending documents for legal certification
   * @access STATE_LAWYER
   */
  @Get('legal/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingLegal() {
    return this.legalService.getPendingDocuments();
  }

  /**
   * Certify a document
   * @access STATE_LAWYER
   */
  @Post('legal/certify/:documentId')
  @UseGuards(JwtAuthGuard)
  async certifyDocument(
    @Param('documentId') documentId: string,
    @Request() req,
    @Body() body: {
      opinion: string;
      opinionRu?: string;
      compliant: boolean;
      notes?: string;
      signature: string;
      publicKey: string;
    },
  ) {
    return this.legalService.certifyDocument(documentId, req.user.userId, body);
  }

  /**
   * Get legal certification
   */
  @Get('legal/certification/:documentId')
  @UseGuards(JwtAuthGuard)
  async getCertification(@Param('documentId') documentId: string) {
    return this.legalService.getCertification(documentId);
  }

  /**
   * Get lawyer's certifications
   */
  @Get('legal/my-certifications')
  @UseGuards(JwtAuthGuard)
  async getMyCertifications(@Request() req) {
    return this.legalService.getLawyerCertifications(req.user.userId);
  }

  /**
   * Get legal opinions
   */
  @Get('legal/opinions')
  async getLegalOpinions(
    @Query('lawyerId') lawyerId?: string,
    @Query('compliant') compliant?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.legalService.getOpinions({
      lawyerId,
      compliant: compliant === 'true' ? true : compliant === 'false' ? false : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * Request document revision
   * @access STATE_LAWYER
   */
  @Post('legal/request-revision/:documentId')
  @UseGuards(JwtAuthGuard)
  async requestRevision(
    @Param('documentId') documentId: string,
    @Request() req,
    @Body() body: { reason: string },
  ) {
    return this.legalService.requestRevision(documentId, req.user.userId, body.reason);
  }

  // ===================
  // ARCHIVE ENDPOINTS
  // ===================

  /**
   * Archive a certified document
   * @access ARCHIVIST
   */
  @Post('archive/:documentId')
  @UseGuards(JwtAuthGuard)
  async archiveDocument(
    @Param('documentId') documentId: string,
    @Request() req,
    @Body() body: {
      archiveNumber: string;
      blockchainTx?: string;
    },
  ) {
    return this.documentService.archiveDocument(
      documentId,
      req.user.userId,
      body.archiveNumber,
      body.blockchainTx,
    );
  }
}

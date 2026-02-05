import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportApplicationService } from '../services/passport-application.service';
import { DocumentStorageService } from '../services/document-storage.service';
import { WarrantService } from '../services/warrant.service';
import { AccessControlService } from '../services/access-control.service';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { MigrationOfficerGuard } from '../guards/migration-officer.guard';
import { AccessRole, DocumentType } from '@prisma/client-migration';

@Controller('api/migration-service')
export class PassportController {
  constructor(
    private passportService: PassportApplicationService,
    private documentService: DocumentStorageService,
    private warrantService: WarrantService,
    private accessControl: AccessControlService,
  ) {}

  /**
   * Create new passport application
   */
  @Post('applications')
  async createApplication(@Body() data: any, @Request() req: any) {
    return this.passportService.createApplication({
      userId: req.user.id,
      ...data,
    });
  }

  /**
   * Submit application for review
   */
  @Post('applications/:id/submit')
  async submitApplication(@Param('id') id: string, @Request() req: any) {
    return this.passportService.submitApplication(id, req.user.id);
  }

  /**
   * Get own application
   */
  @Get('applications/me')
  async getMyApplication(@Request() req: any) {
    return this.passportService.getApplicationByUserId(req.user.id);
  }

  /**
   * Get application by ID (with access control)
   */
  @Get('applications/:id')
  async getApplication(
    @Param('id') id: string,
    @Request() req: any,
    @Query('warrantId') warrantId?: string,
  ) {
    const role = await this.accessControl.getUserRole(req.user.id);
    
    return this.passportService.getApplication(
      id,
      req.user.id,
      role,
      warrantId,
    );
  }

  /**
   * Upload document for application
   */
  @Post('applications/:id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') applicationId: string,
    @UploadedFile() file: any,  // Multer.File type causing issues - using any temporarily
    @Body('documentType') documentType: DocumentType,
    @Request() req: any,
  ) {
    return this.documentService.uploadDocument({
      applicationId,
      documentType,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      uploadedBy: req.user.id,
    });
  }

  /**
   * Get documents for application
   */
  @Get('applications/:id/documents')
  async getDocuments(@Param('id') applicationId: string, @Request() req: any) {
    // Check access first
    const role = await this.accessControl.getUserRole(req.user.id);
    const access = await this.accessControl.checkAccess(
      req.user.id,
      applicationId,
      role,
    );

    if (!access.hasAccess) {
      throw new Error(access.reason || 'Access denied');
    }

    return this.documentService.getDocumentsByApplication(applicationId);
  }

  /**
   * Get pending applications (migration officer only)
   */
  @Get('applications')
  @UseGuards(MigrationOfficerGuard)
  async getPendingApplications() {
    return this.passportService.getPendingApplications();
  }

  /**
   * Review application (migration officer only)
   */
  @Put('applications/:id/review')
  @UseGuards(MigrationOfficerGuard)
  async reviewApplication(
    @Param('id') id: string,
    @Body() data: { decision: 'approve' | 'reject'; rejectionReason?: string },
    @Request() req: any,
  ) {
    return this.passportService.reviewApplication(
      id,
      req.user.id,
      data.decision,
      data.rejectionReason,
    );
  }

  /**
   * Lookup by passport number (law enforcement)
   */
  @Get('lookup/:passportNumber')
  async lookupByPassportNumber(
    @Param('passportNumber') passportNumber: string,
    @Request() req: any,
  ) {
    const role = await this.accessControl.getUserRole(req.user.id);
    
    return this.passportService.lookupByPassportNumber(
      passportNumber,
      req.user.id,
      role,
    );
  }

  /**
   * Request warrant (law enforcement)
   */
  @Post('warrants')
  async requestWarrant(@Body() data: any, @Request() req: any) {
    return this.warrantService.requestWarrant({
      requestedBy: req.user.id,
      ...data,
    });
  }

  /**
   * Get pending warrants (admin only)
   */
  @Get('warrants/pending')
  @UseGuards(AdminGuard)
  async getPendingWarrants() {
    return this.warrantService.getPendingWarrants();
  }

  /**
   * Approve warrant (admin only)
   */
  @Put('warrants/:id/approve')
  @UseGuards(AdminGuard)
  async approveWarrant(
    @Param('id') id: string,
    @Body('validityDays') validityDays: number,
    @Request() req: any,
  ) {
    return this.warrantService.approveWarrant(id, req.user.id, validityDays);
  }

  /**
   * Reject warrant (admin only)
   */
  @Put('warrants/:id/reject')
  @UseGuards(AdminGuard)
  async rejectWarrant(@Param('id') id: string, @Request() req: any) {
    return this.warrantService.rejectWarrant(id, req.user.id);
  }
}

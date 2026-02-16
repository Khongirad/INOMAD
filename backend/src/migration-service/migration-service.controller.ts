import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MigrationServiceService } from './migration-service.service';

@ApiTags('Migration')
@Controller('migration-service')
export class MigrationServiceController {
  constructor(private readonly migrationService: MigrationServiceService) {}

  @Post('applications')
  async createApplication(@Req() req: any, @Body() body: any) {
    return this.migrationService.createApplication(req.user.userId, body);
  }

  @Post('applications/:id/submit')
  async submitApplication(@Req() req: any, @Param('id') id: string) {
    return this.migrationService.submitApplication(req.user.userId, id);
  }

  @Get('applications/me')
  async getMyApplications(@Req() req: any) {
    return this.migrationService.getMyApplications(req.user.userId);
  }

  @Get('applications/:id')
  async getApplication(@Param('id') id: string) {
    return this.migrationService.getApplicationById(id);
  }

  @Get('applications/:id/documents')
  async getDocuments(@Param('id') id: string) {
    return this.migrationService.getDocuments(id);
  }

  @Post('applications/:id/documents')
  async uploadDocument(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // In production: use multer/file upload interceptor
    // For now: accept metadata
    return this.migrationService.uploadDocument(id, {
      type: body.type || 'OTHER',
      filename: body.filename || 'upload',
      mimeType: body.mimeType || 'application/octet-stream',
      size: body.size || 0,
      storagePath: body.storagePath || `/uploads/${id}/${Date.now()}`,
    });
  }

  @Get('lookup/:passportNumber')
  async lookupPassport(@Param('passportNumber') passportNumber: string) {
    return this.migrationService.lookupPassport(passportNumber);
  }

  // Officer endpoints
  @Get('officer/applications')
  async getAllApplications() {
    return this.migrationService.getAllApplications();
  }

  @Put('applications/:id/review')
  async reviewApplication(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; notes?: string; passportNumber?: string },
  ) {
    return this.migrationService.reviewApplication(id, req.user.userId, body);
  }
}

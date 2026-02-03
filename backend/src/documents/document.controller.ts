import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentStatus, DocumentType } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post()
  async create(@Req() req, @Body() data: { templateId: string; metadata: any; recipientIds: string[]; witnessIds?: string[] }) {
    return this.documentService.createDocument({
      ...data,
      creatorId: req.user.id,
    });
  }

  @Get('my')
  async getMyDocuments(@Req() req, @Body() filters?: { status?: DocumentStatus; type?: DocumentType }) {
    return this.documentService.getMyDocuments(req.user.id, filters);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    return this.documentService.getDocument(id);
  }

  @Post(':id/sign')
  async signDocument(@Req() req, @Param('id') id: string, @Body() data: { signature: string }) {
    return this.documentService.signDocument({
      documentId: id,
      signerId: req.user.id,
      signature: data.signature,
      ipAddress: req.ip,
    });
  }
}

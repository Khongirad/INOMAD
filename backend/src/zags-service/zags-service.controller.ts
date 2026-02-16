import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ZagsServiceService } from './zags-service.service';

@ApiTags('ZAGS')
@Controller('zags')
export class ZagsServiceController {
  constructor(private readonly zagsService: ZagsServiceService) {}

  @Get('eligibility/:userId')
  async checkEligibility(@Param('userId') userId: string) {
    return this.zagsService.checkEligibility(userId);
  }

  @Post('marriages')
  async createMarriageApplication(@Req() req: any, @Body() body: any) {
    return this.zagsService.createMarriageApplication(req.user.userId, body);
  }

  @Get('marriages/me')
  async getMyMarriages(@Req() req: any) {
    return this.zagsService.getMyMarriages(req.user.userId);
  }

  @Get('marriages/pending/all')
  async getPendingMarriages() {
    return this.zagsService.getPendingMarriages();
  }

  @Get('marriages/:id')
  async getMarriage(@Param('id') id: string) {
    return this.zagsService.getMarriage(id);
  }

  @Get('consents/pending')
  async getPendingConsents(@Req() req: any) {
    return this.zagsService.getPendingConsents(req.user.userId);
  }

  @Post('marriages/:id/consent')
  async grantConsent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { approve: boolean; signature?: string },
  ) {
    return this.zagsService.grantConsent(req.user.userId, id, body.approve, body.signature);
  }

  @Post('divorces')
  async fileDivorce(@Req() req: any, @Body() body: any) {
    return this.zagsService.fileDivorce(req.user.userId, body);
  }

  @Get('certificates/:certificateNumber')
  async getCertificate(@Param('certificateNumber') certNum: string) {
    return this.zagsService.getCertificate(certNum);
  }

  @Get('certificates/:certificateNumber/verify')
  async verifyCertificate(@Param('certificateNumber') certNum: string) {
    return this.zagsService.verifyCertificate(certNum);
  }

  @Get('public/:certificateNumber')
  async publicCertificateLookup(@Param('certificateNumber') certNum: string) {
    return this.zagsService.verifyCertificate(certNum);
  }

  // Officer endpoints
  @Get('officer/marriages')
  async getAllMarriages() {
    return this.zagsService.getAllMarriages();
  }

  @Post('marriages/:id/approve')
  async approveMarriage(
    @Param('id') id: string,
    @Body() body: { certificateNumber?: string },
  ) {
    return this.zagsService.approveMarriage(id, body.certificateNumber);
  }

  @Post('marriages/:id/reject')
  async rejectMarriage(
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    return this.zagsService.rejectMarriage(id, body.notes);
  }

  @Post('marriages/:id/register')
  async registerMarriage(@Req() req: any, @Param('id') id: string) {
    return this.zagsService.registerMarriage(id, req.user.userId);
  }

  @Post('divorces/:id/finalize')
  async finalizeDivorce(@Req() req: any, @Param('id') id: string) {
    return this.zagsService.finalizeDivorce(id, req.user.userId);
  }

  // ============ Civil Unions ============

  @Post('civil-unions')
  async createCivilUnion(@Req() req: any, @Body() body: any) {
    return this.zagsService.createCivilUnion(req.user.userId, body);
  }

  // ============ Wedding Gifts ============

  @Post('marriages/:id/gifts')
  async recordWeddingGift(
    @Param('id') id: string,
    @Body() body: { giverId: string; giverName: string; recipientId: string; description: string; estimatedValue?: number; category?: string },
  ) {
    return this.zagsService.recordWeddingGift(id, body);
  }

  @Get('marriages/:id/gifts')
  async getWeddingGifts(@Param('id') id: string) {
    return this.zagsService.getWeddingGifts(id);
  }

  // ============ Officer Dashboard ============

  @Get('officer/stats')
  async getOfficerStats() {
    return this.zagsService.getOfficerStats();
  }
}

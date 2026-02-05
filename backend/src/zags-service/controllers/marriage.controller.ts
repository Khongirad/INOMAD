import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MarriageRegistrationService } from '../services/marriage-registration.service';
import { ConsentService } from '../services/consent.service';
import { EligibilityService } from '../services/eligibility.service';
import { ZagsOfficerGuard } from '../guards/zags-officer.guard';
import { CertificateService } from '../services/certificate.service';

@Controller('api/zags')
export class MarriageController {
  constructor(
    private marriageService: MarriageRegistrationService,
    private consentService: ConsentService,
    private eligibilityService: EligibilityService,
    private certificateService: CertificateService,
  ) {}

  /**
   * Check eligibility to marry
   */
  @Get('eligibility/:userId')
  async checkEligibility(@Param('userId') userId: string) {
    return this.eligibilityService.checkEligibility(userId);
  }

  /**
   * Create marriage application
   */
  @Post('marriages')
  async createMarriage(@Body() data: any, @Request() req: any) {
    // Check eligibility first
    const eligibility = await this.eligibilityService.checkBothEligible(
      data.spouse1Id,
      data.spouse2Id,
    );

    if (!eligibility.isEligible) {
      throw new Error(eligibility.reason);
    }

    return this.marriageService.createMarriageApplication(data);
  }

  /**
   * Get my marriages
   */
  @Get('marriages/me')
  async getMyMarriages(@Request() req: any) {
    return this.marriageService.getMarriagesByUser(req.user.id);
  }

  /**
   * Get marriage by ID
   */
  @Get('marriages/:id')
  async getMarriage(@Param('id') id: string) {
    return this.marriageService.getMarriageByCertificate(id);
  }

  /**
   * Get pending consent requests
   */
  @Get('consents/pending')
  async getPendingConsents(@Request() req: any) {
    return this.consentService.getPendingConsents(req.user.id);
  }

  /**
   * Provide consent for marriage
   */
  @Post('marriages/:id/consent')
  async provideConsent(
    @Param('id') marriageId: string,
    @Body() data: { signature: string },
    @Request() req: any,
  ) {
    return this.marriageService.provideConsent({
      marriageId,
      userId: req.user.id,
      signature: data.signature,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Register marriage (ZAGS officer only)
   */
  @Post('marriages/:id/register')
  @UseGuards(ZagsOfficerGuard)
  async registerMarriage(@Param('id') marriageId: string, @Request() req: any) {
    return this.marriageService.registerMarriage({
      marriageId,
      officerId: req.user.id,
    });
  }

  /**
   * Get pending marriages (ZAGS officer only)
   */
  @Get('marriages/pending/all')
  @UseGuards(ZagsOfficerGuard)
  async getPendingMarriages() {
    return this.marriageService.getPendingMarriages();
  }

  /**
   * File for divorce
   */
  @Post('divorces')
  async fileDivorce(@Body() data: any, @Request() req: any) {
    return this.marriageService.fileDivorce({
      ...data,
      initiatedBy: req.user.id,
    });
  }

  /**
   * Finalize divorce (ZAGS officer only)
   */
  @Post('divorces/:id/finalize')
  @UseGuards(ZagsOfficerGuard)
  async finalizeDivorce(@Param('id') divorceId: string, @Request() req: any) {
    return this.marriageService.finalizeDivorce({
      divorceId,
      officerId: req.user.id,
    });
  }

  /**
   * Get marriage certificate
   */
  @Get('certificates/:certificateNumber')
  async getCertificate(@Param('certificateNumber') certificateNumber: string) {
    return this.certificateService.generateMarriageCertificate(certificateNumber);
  }

  /**
   * Verify certificate
   */
  @Get('certificates/:certificateNumber/verify')
  async verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
    return this.certificateService.verifyCertificate(certificateNumber);
  }

  /**
   * Public registry lookup
   */
  @Get('public/:certificateNumber')
  async publicLookup(@Param('certificateNumber') certificateNumber: string) {
    return this.certificateService.getPublicRegistry(certificateNumber);
  }
}

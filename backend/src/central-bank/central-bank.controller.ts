import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CentralBankService } from './central-bank.service';
import { CentralBankAuthService } from './central-bank-auth.service';
import { CBWorkflowService } from './cb-workflow.service';
import {
  CentralBankAuthGuard,
  CentralBankRoles,
  CBAuthenticatedRequest,
} from './central-bank-auth.guard';
import { CBNonceDto, CBTicketDto } from './dto/cb-auth.dto';
import { EmitDto, BurnDto } from './dto/emit.dto';
import { IssueLicenseDto, RevokeLicenseDto } from './dto/license.dto';
import { UpdatePolicyDto } from './dto/policy.dto';

/**
 * Central Bank Controller.
 *
 * Provides API endpoints for the Fourth Branch of Power.
 * Public stats available without auth. All operations require CB ticket.
 */
@Controller('cb')
export class CentralBankController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cbService: CentralBankService,
    private readonly cbAuthService: CentralBankAuthService,
    private readonly workflowService: CBWorkflowService,
  ) {}

  // ============================
  // PUBLIC (no auth)
  // ============================

  @Get('stats')
  async getPublicStats() {
    const stats = await this.cbService.getPublicStats();
    return { ok: true, ...stats };
  }

  // ============================
  // AUTH
  // ============================

  @Post('auth/nonce')
  async requestNonce(@Body() dto: CBNonceDto) {
    const result = await this.cbAuthService.generateNonce(dto.address);
    return { ok: true, ...result };
  }

  @Post('auth/ticket')
  async issueTicket(@Body() dto: CBTicketDto) {
    const result = await this.cbAuthService.issueTicket(
      dto.address,
      dto.signature,
      dto.nonce,
    );
    return { ok: true, ...result };
  }

  // ============================
  // EMISSION (Governor only)
  // ============================

  @Post('emission/mint')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async mint(@Body() dto: EmitDto, @Req() req: CBAuthenticatedRequest) {
    const result = await this.cbService.emitToCorrespondentAccount(
      req.cbUser.officerId,
      dto.corrAccountId,
      dto.amount,
      dto.reason,
      dto.memo,
    );
    return { ok: true, ...result };
  }

  @Post('emission/burn')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async burn(@Body() dto: BurnDto, @Req() req: CBAuthenticatedRequest) {
    const result = await this.cbService.burnFromCorrespondentAccount(
      req.cbUser.officerId,
      dto.corrAccountId,
      dto.amount,
      dto.reason,
    );
    return { ok: true, ...result };
  }

  @Get('emission/history')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getEmissionHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const records = await this.cbService.getEmissionHistory(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
    return { ok: true, records };
  }

  @Get('emission/supply')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getSupply() {
    const supply = await this.cbService.getTotalSupply();
    return { ok: true, ...supply };
  }

  @Get('emission/daily')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getDailyEmission() {
    const daily = await this.cbService.getDailyEmissionUsage();
    return { ok: true, ...daily };
  }

  // ============================
  // LICENSING (Governor only for write, both for read)
  // ============================

  @Post('license/issue')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async issueLicense(@Body() dto: IssueLicenseDto, @Req() req: CBAuthenticatedRequest) {
    const result = await this.cbService.issueLicense(
      req.cbUser.officerId,
      dto.bankAddress,
      dto.bankCode,
      dto.bankName,
    );
    return { ok: true, ...result };
  }

  @Post('license/revoke')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async revokeLicense(@Body() dto: RevokeLicenseDto, @Req() req: CBAuthenticatedRequest) {
    await this.cbService.revokeLicense(
      req.cbUser.officerId,
      dto.licenseId,
      dto.reason,
    );
    return { ok: true };
  }

  @Get('license/list')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getLicensedBanks() {
    const banks = await this.cbService.getLicensedBanks();
    return { ok: true, banks };
  }

  // ============================
  // CORRESPONDENT ACCOUNTS
  // ============================

  @Get('corr-accounts')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getCorrAccounts() {
    const accounts = await this.cbService.getCorrAccounts();
    return { ok: true, accounts };
  }

  // ============================
  // MONETARY POLICY
  // ============================

  @Post('policy/update')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async updatePolicy(@Body() dto: UpdatePolicyDto, @Req() req: CBAuthenticatedRequest) {
    const { reason, ...changes } = dto;
    const result = await this.cbService.updatePolicy(
      req.cbUser.officerId,
      changes,
      reason,
    );
    return { ok: true, policy: result };
  }

  @Get('policy/current')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getCurrentPolicy() {
    const policy = await this.cbService.getCurrentPolicy();
    return { ok: true, policy };
  }

  @Get('policy/history')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR', 'BOARD_MEMBER')
  async getPolicyHistory(@Query('limit') limit?: string) {
    const changes = await this.cbService.getPolicyHistory(
      limit ? parseInt(limit) : 50,
    );
    return { ok: true, changes };
  }

  // ============================
  // FORMAL CB WORKFLOWS (State Archive Integration)
  // ============================

  /**
   * Issue banking license (formal workflow)
   * Uses State Archive document system
   */
  @Post('workflow/issue-license')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async issueBankingLicense(
    @Body() body: {
      name: string;
      nameRu?: string;
      legalAddress: string;
      taxId: string;
      directorId?: string;
    },
    @Req() req: CBAuthenticatedRequest,
  ) {
    const result = await this.workflowService.issueBankingLicense(
      req.cbUser.officerId,
      body,
    );
    return { ok: true, ...result };
  }

  /**
   * Open correspondent account (formal workflow)
   */
  @Post('workflow/open-account')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async openCorrespondentAccount(
    @Body() body: { bankId: string; accountNumber: string },
    @Req() req: CBAuthenticatedRequest,
  ) {
    const result = await this.workflowService.openCorrespondentAccount(
      req.cbUser.officerId,
      body.bankId,
      body.accountNumber,
    );
    return { ok: true, ...result };
  }

  /**
   * Execute ALTAN emission protocol (formal workflow)
   */
  @Post('workflow/emission-protocol')
  @UseGuards(CentralBankAuthGuard)
  @CentralBankRoles('GOVERNOR')
  async executeEmission(
    @Body() body: {
      amount: string;
      recipientBankId: string;
      purpose: string;
      legalBasis?: string;
    },
    @Req() req: CBAuthenticatedRequest,
  ) {
    const result = await this.workflowService.executeEmission(
      req.cbUser.officerId,
      body,
    );
    return { ok: true, ...result };
  }

  /**
   * List all banks
   */
  @Get('banks')
  async listBanks() {
    // Note: Bank model not in Prisma yet due to migration issue
    // Will return empty for now
    return { ok: true, banks: [] };
  }

  /**
   * Get bank details
   */
  @Get('banks/:id')
  async getBank(@Param('id') id: string) {
    return { ok: false, error: 'Bank model not available yet - migration pending' };
  }
}

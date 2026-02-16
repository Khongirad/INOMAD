import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentralBankGuard } from '../auth/guards/central-bank.guard';
import { ethers } from 'ethers';
import { BorrowRequest, RepayLoanRequest } from './types/arban.types';

@ApiTags('Arbans')
@Controller('arbans/credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // ==================== FAMILY CREDIT ====================

  /**
   * Open Family credit line
   * POST /arbans/credit/family/:arbanId/open
   */
  @Post('family/:arbanId/open')
  @HttpCode(HttpStatus.CREATED)
  async openFamilyCreditLine(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    return await this.creditService.openFamilyCreditLine(arbanId, wallet);
  }

  /**
   * Borrow from Family credit line
   * POST /arbans/credit/family/:arbanId/borrow
   */
  @Post('family/:arbanId/borrow')
  @HttpCode(HttpStatus.CREATED)
  async borrowFamily(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { amount: string; durationDays: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: BorrowRequest = {
      arbanId,
      creditType: 'FAMILY',
      amount: body.amount,
      durationDays: body.durationDays,
    };
    return await this.creditService.borrowFamily(request, wallet);
  }

  /**
   * Repay Family loan
   * POST /arbans/credit/family/:arbanId/repay
   */
  @Post('family/:arbanId/repay')
  @HttpCode(HttpStatus.OK)
  async repayFamily(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { loanIdx: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: RepayLoanRequest = {
      arbanId,
      creditType: 'FAMILY',
      loanIdx: body.loanIdx,
    };
    await this.creditService.repayFamily(request, wallet);
    return { success: true, message: 'Loan repaid successfully' };
  }

  /**
   * Get Family credit line
   * GET /arbans/credit/family/:arbanId
   */
  @Get('family/:arbanId')
  async getFamilyCreditLine(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getCreditLine(arbanId, 'FAMILY');
  }

  /**
   * Get Family loans
   * GET /arbans/credit/family/:arbanId/loans
   */
  @Get('family/:arbanId/loans')
  async getFamilyLoans(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getLoans(arbanId, 'FAMILY');
  }

  /**
   * Get Family credit dashboard
   * GET /arbans/credit/family/:arbanId/dashboard
   */
  @Get('family/:arbanId/dashboard')
  async getFamilyCreditDashboard(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getCreditDashboard(arbanId, 'FAMILY');
  }

  // ==================== ORG CREDIT ====================

  /**
   * Open Org credit line
   * POST /arbans/credit/org/:arbanId/open
   */
  @Post('org/:arbanId/open')
  @HttpCode(HttpStatus.CREATED)
  async openOrgCreditLine(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    return await this.creditService.openOrgCreditLine(arbanId, wallet);
  }

  /**
   * Borrow from Org credit line
   * POST /arbans/credit/org/:arbanId/borrow
   */
  @Post('org/:arbanId/borrow')
  @HttpCode(HttpStatus.CREATED)
  async borrowOrg(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { amount: string; durationDays: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: BorrowRequest = {
      arbanId,
      creditType: 'ORG',
      amount: body.amount,
      durationDays: body.durationDays,
    };
    return await this.creditService.borrowOrg(request, wallet);
  }

  /**
   * Repay Org loan
   * POST /arbans/credit/org/:arbanId/repay
   */
  @Post('org/:arbanId/repay')
  @HttpCode(HttpStatus.OK)
  async repayOrg(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { loanIdx: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: RepayLoanRequest = {
      arbanId,
      creditType: 'ORG',
      loanIdx: body.loanIdx,
    };
    await this.creditService.repayOrg(request, wallet);
    return { success: true, message: 'Loan repaid successfully' };
  }

  /**
   * Get Org credit line
   * GET /arbans/credit/org/:arbanId
   */
  @Get('org/:arbanId')
  async getOrgCreditLine(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getCreditLine(arbanId, 'ORG');
  }

  /**
   * Get Org loans
   * GET /arbans/credit/org/:arbanId/loans
   */
  @Get('org/:arbanId/loans')
  async getOrgLoans(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getLoans(arbanId, 'ORG');
  }

  /**
   * Get Org credit dashboard
   * GET /arbans/credit/org/:arbanId/dashboard
   */
  @Get('org/:arbanId/dashboard')
  async getOrgCreditDashboard(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.creditService.getCreditDashboard(arbanId, 'ORG');
  }

  // ==================== CENTRAL BANK ADMIN ====================

  /**
   * Set interest rate (Central Bank only)
   * PUT /arbans/credit/interest-rate
   */
  @Put('interest-rate')
  @UseGuards(CentralBankGuard)
  @HttpCode(HttpStatus.OK)
  async setInterestRate(@Body() body: { rateBps: number }, @Request() req: any) {
    const wallet = this.getWalletFromRequest(req);
    await this.creditService.setInterestRate(body.rateBps, wallet);
    return { success: true, message: 'Interest rate updated', rateBps: body.rateBps };
  }

  /**
   * Get current interest rate
   * GET /arbans/credit/interest-rate
   */
  @Get('interest-rate')
  async getCurrentInterestRate() {
    const rateBps = await this.creditService.getCurrentInterestRate();
    return { rateBps, percentagePerYear: (rateBps / 100).toFixed(2) };
  }

  private getWalletFromRequest(req: any, privateKey?: string): ethers.Wallet {
    const key = privateKey || req.user?.privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(key, provider);
  }
}

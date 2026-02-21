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
import { BorrowRequest, RepayLoanRequest } from './types/arbad.types';

@ApiTags('Arbads')
@Controller('arbads/credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // ==================== FAMILY CREDIT ====================

  /**
   * Open Family credit line
   * POST /arbads/credit/family/:arbadId/open
   */
  @Post('family/:arbadId/open')
  @HttpCode(HttpStatus.CREATED)
  async openFamilyCreditLine(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    return await this.creditService.openFamilyCreditLine(arbadId, wallet);
  }

  /**
   * Borrow from Family credit line
   * POST /arbads/credit/family/:arbadId/borrow
   */
  @Post('family/:arbadId/borrow')
  @HttpCode(HttpStatus.CREATED)
  async borrowFamily(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { amount: string; durationDays: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: BorrowRequest = {
      arbadId,
      creditType: 'FAMILY',
      amount: body.amount,
      durationDays: body.durationDays,
    };
    return await this.creditService.borrowFamily(request, wallet);
  }

  /**
   * Repay Family loan
   * POST /arbads/credit/family/:arbadId/repay
   */
  @Post('family/:arbadId/repay')
  @HttpCode(HttpStatus.OK)
  async repayFamily(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { loanIdx: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: RepayLoanRequest = {
      arbadId,
      creditType: 'FAMILY',
      loanIdx: body.loanIdx,
    };
    await this.creditService.repayFamily(request, wallet);
    return { success: true, message: 'Loan repaid successfully' };
  }

  /**
   * Get Family credit line
   * GET /arbads/credit/family/:arbadId
   */
  @Get('family/:arbadId')
  async getFamilyCreditLine(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getCreditLine(arbadId, 'FAMILY');
  }

  /**
   * Get Family loans
   * GET /arbads/credit/family/:arbadId/loans
   */
  @Get('family/:arbadId/loans')
  async getFamilyLoans(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getLoans(arbadId, 'FAMILY');
  }

  /**
   * Get Family credit dashboard
   * GET /arbads/credit/family/:arbadId/dashboard
   */
  @Get('family/:arbadId/dashboard')
  async getFamilyCreditDashboard(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getCreditDashboard(arbadId, 'FAMILY');
  }

  // ==================== ORG CREDIT ====================

  /**
   * Open Org credit line
   * POST /arbads/credit/org/:arbadId/open
   */
  @Post('org/:arbadId/open')
  @HttpCode(HttpStatus.CREATED)
  async openOrgCreditLine(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    return await this.creditService.openOrgCreditLine(arbadId, wallet);
  }

  /**
   * Borrow from Org credit line
   * POST /arbads/credit/org/:arbadId/borrow
   */
  @Post('org/:arbadId/borrow')
  @HttpCode(HttpStatus.CREATED)
  async borrowOrg(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { amount: string; durationDays: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: BorrowRequest = {
      arbadId,
      creditType: 'ORG',
      amount: body.amount,
      durationDays: body.durationDays,
    };
    return await this.creditService.borrowOrg(request, wallet);
  }

  /**
   * Repay Org loan
   * POST /arbads/credit/org/:arbadId/repay
   */
  @Post('org/:arbadId/repay')
  @HttpCode(HttpStatus.OK)
  async repayOrg(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { loanIdx: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: RepayLoanRequest = {
      arbadId,
      creditType: 'ORG',
      loanIdx: body.loanIdx,
    };
    await this.creditService.repayOrg(request, wallet);
    return { success: true, message: 'Loan repaid successfully' };
  }

  /**
   * Get Org credit line
   * GET /arbads/credit/org/:arbadId
   */
  @Get('org/:arbadId')
  async getOrgCreditLine(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getCreditLine(arbadId, 'ORG');
  }

  /**
   * Get Org loans
   * GET /arbads/credit/org/:arbadId/loans
   */
  @Get('org/:arbadId/loans')
  async getOrgLoans(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getLoans(arbadId, 'ORG');
  }

  /**
   * Get Org credit dashboard
   * GET /arbads/credit/org/:arbadId/dashboard
   */
  @Get('org/:arbadId/dashboard')
  async getOrgCreditDashboard(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.creditService.getCreditDashboard(arbadId, 'ORG');
  }

  // ==================== CENTRAL BANK ADMIN ====================

  /**
   * Set interest rate (Central Bank only)
   * PUT /arbads/credit/interest-rate
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
   * GET /arbads/credit/interest-rate
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

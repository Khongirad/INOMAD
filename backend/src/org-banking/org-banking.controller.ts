import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgBankingService } from './org-banking.service';
import { OrgBankTxStatus, OrgBankTxType } from '@prisma/client';

@Controller('org-banking')
@UseGuards(AuthGuard)
export class OrgBankingController {
  constructor(private readonly bankingService: OrgBankingService) {}

  // ===========================================================================
  // ACCOUNTS
  // ===========================================================================

  @Get('accounts/:orgId')
  async getOrgAccounts(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.bankingService.getOrgAccounts(orgId);
  }

  // ===========================================================================
  // TRANSACTIONS
  // ===========================================================================

  @Post('transaction/initiate')
  async initiateTransaction(
    @Request() req,
    @Body()
    dto: {
      accountId: string;
      type: OrgBankTxType;
      amount: number;
      description: string;
      recipientAccount?: string;
    },
  ) {
    return this.bankingService.initiateTransaction(
      dto.accountId,
      req.user.userId,
      dto,
    );
  }

  @Post('transaction/:txId/sign')
  async signTransaction(
    @Param('txId', ParseUUIDPipe) txId: string,
    @Request() req,
  ) {
    return this.bankingService.signTransaction(txId, req.user.userId);
  }

  @Post('transaction/:txId/bank-approve')
  async bankApproveTransaction(
    @Param('txId', ParseUUIDPipe) txId: string,
    @Request() req,
    @Body() dto: { approve: boolean; note?: string },
  ) {
    return this.bankingService.bankApproveTransaction(
      txId,
      req.user.userId,
      dto.approve,
      dto.note,
    );
  }

  @Post('transaction/:txId/cancel')
  async cancelTransaction(
    @Param('txId', ParseUUIDPipe) txId: string,
    @Request() req,
  ) {
    return this.bankingService.cancelTransaction(txId, req.user.userId);
  }

  @Get('transactions/:accountId')
  async getAccountTransactions(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrgBankTxStatus,
  ) {
    return this.bankingService.getAccountTransactions(accountId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });
  }

  @Get('transactions/:accountId/pending')
  async getPendingTransactions(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.bankingService.getPendingTransactions(accountId);
  }

  // ===========================================================================
  // DAILY REPORTS
  // ===========================================================================

  @Get('reports/:accountId')
  async getDailyReports(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bankingService.getDailyReports(accountId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
    });
  }

  @Get('reports/:accountId/:date')
  async getDailyReport(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('date') date: string,
  ) {
    return this.bankingService.getDailyReport(accountId, new Date(date));
  }
}

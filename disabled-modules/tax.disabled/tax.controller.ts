import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaxService } from './tax.service';
import { CentralBankGuard } from '../auth/guards/central-bank.guard';

class QuoteTaxDto {
  amount: string; // ALTAN amount as string
}

class CollectTaxDto {
  payerAccountId: string; // bytes32
  republicKey: string; // bytes32
  asset: string; // token address
  amount: string; // ALTAN amount
  privateKey: string;
}

class SetRepublicDto {
  republicKey: string;
  republicAccountId: string;
  privateKey: string;
}

class SetCollectorDto {
  collectorAddress: string;
  allowed: boolean;
  privateKey: string;
}

/**
 * Tax Controller
 * REST API for tax system
 */
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  /**
   * GET /tax/quote?amount=100
   * Quote tax for an amount
   */
  @Get('quote')
  async quoteTax(@Query('amount') amount: string) {
    const quote = await this.taxService.quoteTax(amount);
    return {
      success: true,
      data: quote,
    };
  }

  /**
   * POST /tax/collect
   * Collect tax from payer
   * Requires collector permissions
   */
  @Post('collect')
  @HttpCode(HttpStatus.OK)
  async collectTax(@Body() dto: CollectTaxDto) {
    const txHash = await this.taxService.collectTax(
      dto.payerAccountId,
      dto.republicKey,
      dto.asset,
      dto.amount,
      dto.privateKey,
    );

    return {
      success: true,
      data: { txHash },
    };
  }

  /**
   * GET /tax/stats
   * Get tax statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.taxService.getTaxStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /tax/confederation-account
   * Get confederation budget account ID
   */
  @Get('confederation-account')
  async getConfederationAccount() {
    const accountId = await this.taxService.getConfederationAccountId();
    return {
      success: true,
      data: { accountId },
    };
  }

  /**
   * GET /tax/republic/:key/account
   * Get republic budget account ID
   */
  @Get('republic/:key/account')
  async getRepublicAccount(@Param('key') republicKey: string) {
    const accountId = await this.taxService.getRepublicAccountId(republicKey);
    return {
      success: true,
      data: { accountId },
    };
  }

  /**
   * PUT /tax/republic
   * Set republic account (admin only)
   */
  @Put('republic')
  @UseGuards(CentralBankGuard)
  async setRepublic(@Body() dto: SetRepublicDto) {
    const txHash = await this.taxService.setRepublic(
      dto.republicKey,
      dto.republicAccountId,
      dto.privateKey,
    );

    return {
      success: true,
      data: { txHash },
    };
  }

  /**
   * PUT /tax/collector
   * Set collector permissions (admin only)
   */
  @Put('collector')
  @UseGuards(CentralBankGuard)
  async setCollector(@Body() dto: SetCollectorDto) {
    const txHash = await this.taxService.setCollector(
      dto.collectorAddress,
      dto.allowed,
      dto.privateKey,
    );

    return {
      success: true,
      data: { txHash },
    };
  }

  /**
   * GET /tax/collector/:address/check
   * Check if address is collector
   */
  @Get('collector/:address/check')
  async checkCollector(@Param('address') address: string) {
    const isCollector = await this.taxService.isCollector(address);
    return {
      success: true,
      data: { isCollector },
    };
  }
}

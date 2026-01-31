import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ZunService } from './zun.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ethers } from 'ethers';
import { FormZunRequest } from './types/arban.types';

@Controller('arbans/zun')
@UseGuards(JwtAuthGuard)
export class ZunController {
  constructor(private readonly zunService: ZunService) {}

  /**
   * Form Zun (Clan)
   * POST /arbans/zun
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async formZun(@Body() request: FormZunRequest, @Request() req: any) {
    const wallet = this.getWalletFromRequest(req, request.privateKey);
    return await this.zunService.formZun(request, wallet);
  }

  /**
   * Set Zun elder
   * PUT /arbans/zun/:zunId/elder
   */
  @Put(':zunId/elder')
  @HttpCode(HttpStatus.OK)
  async setZunElder(
    @Param('zunId', ParseIntPipe) zunId: number,
    @Body() body: { elderSeatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    await this.zunService.setZunElder(zunId, body.elderSeatId, wallet);
    return { success: true, message: 'Zun elder set successfully' };
  }

  /**
   * Get Zun by ID
   * GET /arbans/zun/:zunId
   */
  @Get(':zunId')
  async getZun(@Param('zunId', ParseIntPipe) zunId: number) {
    return await this.zunService.getZun(zunId);
  }

  /**
   * Get Zuns by Family Arban
   * GET /arbans/zun/by-family/:arbanId
   */
  @Get('by-family/:arbanId')
  async getZunsByFamily(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.zunService.getZunsByFamily(arbanId);
  }

  /**
   * Sync Zun from blockchain
   * POST /arbans/zun/:zunId/sync
   */
  @Post(':zunId/sync')
  @HttpCode(HttpStatus.OK)
  async syncFromBlockchain(@Param('zunId', ParseIntPipe) zunId: number) {
    await this.zunService.syncFromBlockchain(zunId);
    return { success: true, message: 'Sync completed' };
  }

  private getWalletFromRequest(req: any, privateKey?: string): ethers.Wallet {
    const key = privateKey || req.user?.privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(key, provider);
  }
}

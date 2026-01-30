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
import { FamilyArbanService } from './family-arban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ethers } from 'ethers';
import {
  RegisterMarriageRequest,
  AddChildRequest,
  ChangeHeirRequest,
  SetKhuralRepRequest,
} from './types/arban.types';

@Controller('arbans/family')
@UseGuards(JwtAuthGuard)
export class FamilyArbanController {
  constructor(private readonly familyArbanService: FamilyArbanService) {}

  /**
   * Register marriage and create Family Arban
   * POST /arbans/family/marriage
   */
  @Post('marriage')
  @HttpCode(HttpStatus.CREATED)
  async registerMarriage(@Body() request: RegisterMarriageRequest, @Request() req: any) {
    // Get user's wallet from session
    const wallet = this.getWalletFromRequest(req);
    return await this.familyArbanService.registerMarriage(request, wallet);
  }

  /**
   * Add child to Family Arban
   * POST /arbans/family/:arbanId/children
   */
  @Post(':arbanId/children')
  @HttpCode(HttpStatus.CREATED)
  async addChild(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { childSeatId: number },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req);
    const request: AddChildRequest = { arbanId, childSeatId: body.childSeatId };
    await this.familyArbanService.addChild(request, wallet);
    return { success: true, message: 'Child added successfully' };
  }

  /**
   * Change heir
   * PUT /arbans/family/:arbanId/heir
   */
  @Put(':arbanId/heir')
  @HttpCode(HttpStatus.OK)
  async changeHeir(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { newHeirSeatId: number },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req);
    const request: ChangeHeirRequest = { arbanId, newHeirSeatId: body.newHeirSeatId };
    await this.familyArbanService.changeHeir(request, wallet);
    return { success: true, message: 'Heir changed successfully' };
  }

  /**
   * Set Khural representative
   * POST /arbans/family/:arbanId/khural-rep
   */
  @Post(':arbanId/khural-rep')
  @HttpCode(HttpStatus.OK)
  async setKhuralRep(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { repSeatId: number; birthYear: number },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req);
    const request: SetKhuralRepRequest = {
      arbanId,
      repSeatId: body.repSeatId,
      birthYear: body.birthYear,
    };
    await this.familyArbanService.setKhuralRepresentative(request, wallet);
    return { success: true, message: 'Khural representative set successfully' };
  }

  /**
   * Get all Khural representatives
   * GET /arbans/family/khural-reps
   */
  @Get('khural-reps')
  async getKhuralRepresentatives() {
    return await this.familyArbanService.getKhuralRepresentatives();
  }

  /**
   * Get Family Arban by ID
   * GET /arbans/family/:arbanId
   */
  @Get(':arbanId')
  async getFamilyArban(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.familyArbanService.getFamilyArban(arbanId);
  }

  /**
   * Get Family Arban by seat ID
   * GET /arbans/family/by-seat/:seatId
   */
  @Get('by-seat/:seatId')
  async getFamilyArbanBySeat(@Param('seatId', ParseIntPipe) seatId: number) {
    return await this.familyArbanService.getFamilyArbanBySeat(seatId);
  }

  /**
   * Check Khural eligibility
   * GET /arbans/family/:arbanId/khural-eligible
   */
  @Get(':arbanId/khural-eligible')
  async checkKhuralEligibility(@Param('arbanId', ParseIntPipe) arbanId: number) {
    const eligible = await this.familyArbanService.checkKhuralEligibility(arbanId);
    return { arbanId, eligible };
  }

  /**
   * Sync Family Arban from blockchain
   * POST /arbans/family/:arbanId/sync
   */
  @Post(':arbanId/sync')
  @HttpCode(HttpStatus.OK)
  async syncFromBlockchain(@Param('arbanId', ParseIntPipe) arbanId: number) {
    await this.familyArbanService.syncFromBlockchain(arbanId);
    return { success: true, message: 'Sync completed' };
  }

  // Helper to extract wallet from request
  private getWalletFromRequest(req: any): ethers.Wallet {
    // TODO: Implement proper wallet extraction from user session
    // For now, using a placeholder
    const privateKey = req.user?.privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(privateKey, provider);
  }
}

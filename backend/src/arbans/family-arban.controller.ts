import { ApiTags } from '@nestjs/swagger';
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
import { FamilyArbadService } from './family-arbad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ethers } from 'ethers';
import {
  RegisterMarriageRequest,
  AddChildRequest,
  ChangeHeirRequest,
  SetKhuralRepRequest,
} from './types/arbad.types';

@ApiTags('Arbads')
@Controller('arbads/family')
@UseGuards(JwtAuthGuard)
export class FamilyArbadController {
  constructor(private readonly familyArbadService: FamilyArbadService) {}

  /**
   * Register marriage and create Family Arbad
   * POST /arbads/family/marriage
   */
  @Post('marriage')
  @HttpCode(HttpStatus.CREATED)
  async registerMarriage(@Body() request: RegisterMarriageRequest, @Request() req: any) {
    // Get user's wallet from request body (privateKey sent by client)
    const wallet = this.getWalletFromRequest(req, request.privateKey);
    return await this.familyArbadService.registerMarriage(request, wallet);
  }

  /**
   * Add child to Family Arbad
   * POST /arbads/family/:arbadId/children
   */
  @Post(':arbadId/children')
  @HttpCode(HttpStatus.CREATED)
  async addChild(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { childSeatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: AddChildRequest = { arbadId, childSeatId: body.childSeatId };
    await this.familyArbadService.addChild(request, wallet);
    return { success: true, message: 'Child added successfully' };
  }

  /**
   * Change heir
   * PUT /arbads/family/:arbadId/heir
   */
  @Put(':arbadId/heir')
  @HttpCode(HttpStatus.OK)
  async changeHeir(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { newHeirSeatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: ChangeHeirRequest = { arbadId, newHeirSeatId: body.newHeirSeatId };
    await this.familyArbadService.changeHeir(request, wallet);
    return { success: true, message: 'Heir changed successfully' };
  }

  /**
   * Set Khural representative
   * POST /arbads/family/:arbadId/khural-rep
   */
  @Post(':arbadId/khural-rep')
  @HttpCode(HttpStatus.OK)
  async setKhuralRep(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { repSeatId: string; birthYear: number; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: SetKhuralRepRequest = {
      arbadId,
      repSeatId: body.repSeatId,
      birthYear: body.birthYear,
    };
    await this.familyArbadService.setKhuralRepresentative(request, wallet);
    return { success: true, message: 'Khural representative set successfully' };
  }

  /**
   * Get all Khural representatives
   * GET /arbads/family/khural-reps
   */
  @Get('khural-reps')
  async getKhuralRepresentatives() {
    return await this.familyArbadService.getKhuralRepresentatives();
  }

  /**
   * Get Family Arbad by ID
   * GET /arbads/family/:arbadId
   */
  @Get(':arbadId')
  async getFamilyArbad(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.familyArbadService.getFamilyArbad(arbadId);
  }

  /**
   * Get Family Arbad by seat ID
   * GET /arbads/family/by-seat/:seatId
   */
  @Get('by-seat/:seatId')
  async getFamilyArbadBySeat(@Param('seatId') seatId: string) {
    return await this.familyArbadService.getFamilyArbadBySeat(seatId);
  }

  /**
   * Check Khural eligibility
   * GET /arbads/family/:arbadId/khural-eligible
   */
  @Get(':arbadId/khural-eligible')
  async checkKhuralEligibility(@Param('arbadId', ParseIntPipe) arbadId: number) {
    const eligible = await this.familyArbadService.checkKhuralEligibility(arbadId);
    return { arbadId, eligible };
  }

  /**
   * Sync Family Arbad from blockchain
   * POST /arbads/family/:arbadId/sync
   */
  @Post(':arbadId/sync')
  @HttpCode(HttpStatus.OK)
  async syncFromBlockchain(@Param('arbadId', ParseIntPipe) arbadId: number) {
    await this.familyArbadService.syncFromBlockchain(arbadId);
    return { success: true, message: 'Sync completed' };
  }

  // Helper to extract wallet from request
  private getWalletFromRequest(req: any, privateKey?: string): ethers.Wallet {
    // Use privateKey from request body (sent by client) or fallback to env
    const key = privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(key, provider);
  }
}

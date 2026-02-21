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
import { OrganizationalArbadService } from './organizational-arbad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ethers } from 'ethers';
import { OrganizationType } from '../blockchain/abis/arbadCompletion.abi';
import {
  CreateOrgArbadRequest,
  AddOrgMemberRequest,
  SetOrgLeaderRequest,
  CreateDepartmentRequest,
} from './types/arbad.types';

@ApiTags('Arbads')
@Controller('arbads/org')
@UseGuards(JwtAuthGuard)
export class OrganizationalArbadController {
  constructor(private readonly orgArbadService: OrganizationalArbadService) {}

  /**
   * Create Organizational Arbad
   * POST /arbads/org
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrgArbad(@Body() request: CreateOrgArbadRequest, @Request() req: any) {
    const wallet = this.getWalletFromRequest(req, request.privateKey);
    return await this.orgArbadService.createOrganizationalArbad(request, wallet);
  }

  /**
   * Add member to organization
   * POST /arbads/org/:arbadId/members
   */
  @Post(':arbadId/members')
  @HttpCode(HttpStatus.CREATED)
  async addOrgMember(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { seatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: AddOrgMemberRequest = { arbadId, seatId: body.seatId };
    await this.orgArbadService.addOrgMember(request, wallet);
    return { success: true, message: 'Member added successfully' };
  }

  /**
   * Set organization leader
   * PUT /arbads/org/:arbadId/leader
   */
  @Put(':arbadId/leader')
  @HttpCode(HttpStatus.OK)
  async setOrgLeader(
    @Param('arbadId', ParseIntPipe) arbadId: number,
    @Body() body: { leaderSeatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: SetOrgLeaderRequest = { arbadId, leaderSeatId: body.leaderSeatId };
    await this.orgArbadService.setOrgLeader(request, wallet);
    return { success: true, message: 'Leader set successfully' };
  }

  /**
   * Create department
   * POST /arbads/org/:parentOrgId/departments
   */
  @Post(':parentOrgId/departments')
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(
    @Param('parentOrgId', ParseIntPipe) parentOrgId: number,
    @Body() body: { deptName: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: CreateDepartmentRequest = { parentOrgId, deptName: body.deptName };
    return await this.orgArbadService.createDepartment(request, wallet);
  }

  /**
   * Get Organizational Arbad by ID
   * GET /arbads/org/:arbadId
   */
  @Get(':arbadId')
  async getOrgArbad(@Param('arbadId', ParseIntPipe) arbadId: number) {
    return await this.orgArbadService.getOrgArbad(arbadId);
  }

  /**
   * Get organizations by type
   * GET /arbads/org?type=EXECUTIVE
   */
  @Get()
  async getOrgsByType(@Query('type') type: string) {
    // Map string to enum
    const typeMap: Record<string, OrganizationType> = {
      EXECUTIVE: OrganizationType.EXECUTIVE,
      JUDICIAL: OrganizationType.JUDICIAL,
      BANKING: OrganizationType.BANKING,
      PRIVATE_COMPANY: OrganizationType.PRIVATE_COMPANY,
      STATE_COMPANY: OrganizationType.STATE_COMPANY,
      GUILD: OrganizationType.GUILD,
      SCIENTIFIC_COUNCIL: OrganizationType.SCIENTIFIC_COUNCIL,
      EKHE_KHURAL: OrganizationType.EKHE_KHURAL,
    };

    const orgType = typeMap[type] || OrganizationType.NONE;
    return await this.orgArbadService.getOrgsByType(orgType);
  }

  private getWalletFromRequest(req: any, privateKey?: string): ethers.Wallet {
    const key = privateKey || req.user?.privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(key, provider);
  }
}

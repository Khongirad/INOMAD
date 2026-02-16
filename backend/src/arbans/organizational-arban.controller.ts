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
import { OrganizationalArbanService } from './organizational-arban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ethers } from 'ethers';
import { OrganizationType } from '../blockchain/abis/arbanCompletion.abi';
import {
  CreateOrgArbanRequest,
  AddOrgMemberRequest,
  SetOrgLeaderRequest,
  CreateDepartmentRequest,
} from './types/arban.types';

@ApiTags('Arbans')
@Controller('arbans/org')
@UseGuards(JwtAuthGuard)
export class OrganizationalArbanController {
  constructor(private readonly orgArbanService: OrganizationalArbanService) {}

  /**
   * Create Organizational Arban
   * POST /arbans/org
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrgArban(@Body() request: CreateOrgArbanRequest, @Request() req: any) {
    const wallet = this.getWalletFromRequest(req, request.privateKey);
    return await this.orgArbanService.createOrganizationalArban(request, wallet);
  }

  /**
   * Add member to organization
   * POST /arbans/org/:arbanId/members
   */
  @Post(':arbanId/members')
  @HttpCode(HttpStatus.CREATED)
  async addOrgMember(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { seatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: AddOrgMemberRequest = { arbanId, seatId: body.seatId };
    await this.orgArbanService.addOrgMember(request, wallet);
    return { success: true, message: 'Member added successfully' };
  }

  /**
   * Set organization leader
   * PUT /arbans/org/:arbanId/leader
   */
  @Put(':arbanId/leader')
  @HttpCode(HttpStatus.OK)
  async setOrgLeader(
    @Param('arbanId', ParseIntPipe) arbanId: number,
    @Body() body: { leaderSeatId: string; privateKey?: string },
    @Request() req: any,
  ) {
    const wallet = this.getWalletFromRequest(req, body.privateKey);
    const request: SetOrgLeaderRequest = { arbanId, leaderSeatId: body.leaderSeatId };
    await this.orgArbanService.setOrgLeader(request, wallet);
    return { success: true, message: 'Leader set successfully' };
  }

  /**
   * Create department
   * POST /arbans/org/:parentOrgId/departments
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
    return await this.orgArbanService.createDepartment(request, wallet);
  }

  /**
   * Get Organizational Arban by ID
   * GET /arbans/org/:arbanId
   */
  @Get(':arbanId')
  async getOrgArban(@Param('arbanId', ParseIntPipe) arbanId: number) {
    return await this.orgArbanService.getOrgArban(arbanId);
  }

  /**
   * Get organizations by type
   * GET /arbans/org?type=EXECUTIVE
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
    return await this.orgArbanService.getOrgsByType(orgType);
  }

  private getWalletFromRequest(req: any, privateKey?: string): ethers.Wallet {
    const key = privateKey || req.user?.privateKey || process.env.DEFAULT_SIGNER_KEY;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    return new ethers.Wallet(key, provider);
  }
}

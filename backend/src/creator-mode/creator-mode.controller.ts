import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorModeService } from './creator-mode.service';
import { AssumeRoleDto, InitiateTransferDto } from './dto/creator-mode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('creator-mode')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('creator')
export class CreatorModeController {
  constructor(private readonly creatorModeService: CreatorModeService) {}

  // ── PUBLIC — accessible without auth for transparency ───────────────────

  @Public()
  @Get('governance-status')
  @ApiOperation({ summary: 'Get formation status for all 4 branches (public)' })
  getGovernanceStatus() {
    return this.creatorModeService.getGovernanceStatus();
  }

  @Public()
  @Get('active-roles')
  @ApiOperation({ summary: 'List all active provisional roles (public transparency)' })
  getActiveRoles() {
    return this.creatorModeService.getActiveRoles();
  }

  @Public()
  @Get('audit-log')
  @ApiOperation({ summary: 'Public immutable audit log of Creator actions' })
  getPublicAuditLog(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.creatorModeService.getPublicAuditLog(+page, +limit);
  }


  // ── CREATOR ONLY ────────────────────────────────────────────────────────

  @Get('my-roles')
  @ApiOperation({ summary: 'Get all Creator provisional roles (Creator only)' })
  getAllRoles(@Request() req: any) {
    return this.creatorModeService.getAllRoles(req.user.userId);
  }

  @Post('assume-role')
  @ApiOperation({ summary: 'Creator assumes a provisional government role' })
  assumeRole(@Request() req: any, @Body() dto: AssumeRoleDto) {
    return this.creatorModeService.assumeRole(req.user.userId, dto);
  }

  @Post('initiate-transfer')
  @ApiOperation({ summary: 'Creator initiates Transfer of Power to a citizen' })
  initiateTransfer(@Request() req: any, @Body() dto: InitiateTransferDto) {
    return this.creatorModeService.initiateTransfer(req.user.userId, dto);
  }

  @Post('sign-transfer-act/:roleId')
  @ApiOperation({ summary: 'Creator signs Transfer Act — completes handover (IRREVERSIBLE)' })
  signTransferAct(@Request() req: any, @Param('roleId') roleId: string) {
    return this.creatorModeService.signTransferAct(req.user.userId, roleId);
  }

  @Post('set-role-name/:roleId')
  @ApiOperation({ summary: 'Creator sets display name for a provisional role (naming rights)' })
  setRoleDisplayName(
    @Request() req: any,
    @Param('roleId') roleId: string,
    @Body('displayName') displayName: string,
  ) {
    return this.creatorModeService.setRoleDisplayName(req.user.userId, roleId, displayName);
  }
}

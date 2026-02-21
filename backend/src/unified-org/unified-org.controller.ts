import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UnifiedOrgService } from './unified-org.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  ChangeMemberRoleDto,
  SetPermissionsDto,
  RateOrganizationDto,
  CreateMyangadDto,
  CreateTumedDto,
  CreateRepublicDto,
} from './dto/unified-org.dto';
import { OrganizationType, BranchType, RatingCategory } from '@prisma/client';

@ApiTags('UnifiedOrg')
@Controller('org')
@UseGuards(AuthGuard)
export class UnifiedOrgController {
  constructor(private readonly orgService: UnifiedOrgService) {}

  // ===========================================================================
  // ORGANIZATION CRUD
  // ===========================================================================

  @Post()
  async createOrganization(@Request() req, @Body() dto: CreateOrganizationDto) {
    return this.orgService.createOrganization(req.user.userId, dto);
  }

  @Get('list')
  async listOrganizations(
    @Query('type') type?: OrganizationType,
    @Query('branch') branch?: BranchType,
    @Query('republic') republic?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orgService.listOrganizations({
      type,
      branch,
      republic,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('type') type?: OrganizationType,
    @Query('limit') limit?: string,
  ) {
    return this.orgService.getLeaderboard(type, limit ? parseInt(limit) : 50);
  }

  @Get('hierarchy')
  async getHierarchyTree() {
    return this.orgService.getHierarchyTree();
  }

  @Get(':id')
  async getOrganization(@Param('id') id: string) {
    return this.orgService.getOrganizationDashboard(id);
  }

  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.updateOrganization(id, req.user.userId, dto);
  }

  // ===========================================================================
  // MEMBER MANAGEMENT
  // ===========================================================================

  @Get(':id/members')
  async listMembers(@Param('id') id: string) {
    return this.orgService.listMembers(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AddMemberDto,
  ) {
    return this.orgService.addMember(id, req.user.userId, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.orgService.removeMember(id, req.user.userId, userId);
  }

  @Put(':id/members/role')
  async changeMemberRole(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.orgService.changeMemberRole(id, req.user.userId, dto);
  }

  @Post(':id/transfer-leadership')
  async transferLeadership(
    @Param('id') id: string,
    @Request() req,
    @Body('newLeaderId') newLeaderId: string,
  ) {
    return this.orgService.transferLeadership(id, req.user.userId, newLeaderId);
  }

  // ===========================================================================
  // PERMISSIONS
  // ===========================================================================

  @Get(':id/permissions')
  async getPermissions(@Param('id') id: string) {
    return this.orgService.getPermissions(id);
  }

  @Put(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.orgService.setPermissions(id, req.user.userId, dto);
  }

  // ===========================================================================
  // RATINGS
  // ===========================================================================

  @Post(':id/rate')
  async rateOrganization(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RateOrganizationDto,
  ) {
    return this.orgService.rateOrganization(
      id,
      req.user.userId,
      dto.category as RatingCategory,
      dto.score,
      dto.comment,
    );
  }

  // ===========================================================================
  // HIERARCHY MANAGEMENT
  // ===========================================================================

  @Post('hierarchy/myangad')
  async createMyangad(@Body() dto: CreateMyangadDto) {
    return this.orgService.createMyangad(dto);
  }

  @Post('hierarchy/myangad/:myangadId/assign-zun')
  async assignZunToMyangad(
    @Param('myangadId') myanganId: string,
    @Body('zunId') zunId: string,
  ) {
    return this.orgService.assignZunToMyangad(zunId, myangadId);
  }

  @Post('hierarchy/tumed')
  async createTumed(@Body() dto: CreateTumedDto) {
    return this.orgService.createTumed(dto);
  }

  @Post('hierarchy/tumed/:tumedId/assign-myangad')
  async assignMyangadToTumed(
    @Param('tumedId') tumedId: string,
    @Body('myangadId') myanganId: string,
  ) {
    return this.orgService.assignMyangadToTumed(myangadId, tumedId);
  }

  @Post('hierarchy/republic')
  async createRepublic(@Body() dto: CreateRepublicDto) {
    return this.orgService.createRepublic(dto);
  }
}

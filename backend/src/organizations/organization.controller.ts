import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationType, BranchType, MemberRole, RatingCategory } from '@prisma/client';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  // ============== CRUD ==============

  @Post()
  async create(
    @Body()
    data: {
      name: string;
      type: OrganizationType;
      branch?: BranchType;
      description?: string;
      leaderId: string;
      level: number;
      republicId?: string;
      republic?: string;
      parentId?: string;
    },
  ) {
    return this.organizationService.createOrganization(data);
  }

  // ============== Leaderboard (before :id) ==============

  @Get('leaderboard')
  async getLeaderboard(@Query('type') type?: OrganizationType, @Query('limit') limit?: string) {
    return this.organizationService.getLeaderboard(type, limit ? parseInt(limit) : 100);
  }

  // ============== Network Map (before :id) ==============

  @Get('network/map')
  async getNetworkMap() {
    return this.organizationService.getFullNetworkMap();
  }

  @Get('network/:arbanId')
  async getArbanNetwork(@Param('arbanId') arbanId: string) {
    return this.organizationService.getArbanNetwork(arbanId);
  }

  // ============== Get by ID ==============

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.organizationService.getOrganization(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.organizationService.updateOrganization(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.organizationService.deleteOrganization(id);
  }

  // ============== Membership ==============

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() data: { userId: string; role?: MemberRole },
  ) {
    return this.organizationService.addMember(id, data.userId, data.role);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.organizationService.removeMember(id, userId);
  }

  @Post(':id/transfer-leadership')
  async transferLeadership(@Param('id') id: string, @Body() data: { newLeaderId: string }) {
    return this.organizationService.transferLeadership(id, data.newLeaderId);
  }

  // ============== Ratings ==============

  @Post(':id/rate')
  async rate(
    @Param('id') id: string,
    @Body()
    data: {
      raterId: string;
      category: RatingCategory;
      score: number;
      comment?: string;
      contractId?: string;
    },
  ) {
    return this.organizationService.rateOrganization(
      id,
      data.raterId,
      data.category,
      data.score,
      data.comment,
      data.contractId,
    );
  }

  @Get(':id/ratings')
  async getRatings(@Param('id') id: string) {
    const org = await this.organizationService.getOrganization(id);
    return org.ratings;
  }

  // ============== Financial ==============

  @Post(':id/revenue')
  async addRevenue(
    @Param('id') id: string,
    @Body() data: { amount: number; source: string },
  ) {
    return this.organizationService.addRevenue(id, data.amount, data.source);
  }
}

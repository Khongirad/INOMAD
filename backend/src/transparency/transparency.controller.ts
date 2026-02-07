import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { TransparencyService } from './transparency.service';
import { PowerBranchType, HierarchyLevel } from '@prisma/client';

/**
 * PUBLIC Transparency Controller - No authentication required
 * All endpoints accessible to any arban member
 */
@Controller('transparency')
export class TransparencyController {
  constructor(
    private activityService: ActivityLogService,
    private transparencyService: TransparencyService,
  ) {}

  /**
   * Get activity timeline (PUBLIC - no auth required)
   */
  @Get('activities')
  
  async getActivities(
    @Query('powerBranch') powerBranch?: PowerBranchType,
    @Query('hierarchyLevel') hierarchyLevel?: HierarchyLevel,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getActivities({
      powerBranch,
      hierarchyLevel,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  /**
   * Get aggregated reports (PUBLIC)
   */
  @Get('reports')
  
  async getReports(@Query('powerBranch') powerBranch?: string) {
    return this.transparencyService.getPublicReports(powerBranch);
  }

  /**
   * Get activities for specific branch (PUBLIC)
   */
  @Get('legislative')
  
  async getLegislativeActivities(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.activityService.getActivities({
      powerBranch: 'LEGISLATIVE',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  }

  @Get('executive')
  
  async getExecutiveActivities(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.activityService.getActivities({
      powerBranch: 'EXECUTIVE',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  }

  @Get('judicial')
  
  async getJudicialActivities(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.activityService.getActivities({
      powerBranch: 'JUDICIAL',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  }

  @Get('banking')
  
  async getBankingActivities(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.activityService.getActivities({
      powerBranch: 'BANKING',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  }

  /**
   * Get hierarchy rollup (PUBLIC)
   */
  @Get('hierarchy')
  
  async getHierarchyActivities(
    @Query('powerBranch') powerBranch: PowerBranchType,
    @Query('startLevel') startLevel: HierarchyLevel,
    @Query('endLevel') endLevel: HierarchyLevel,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.activityService.getHierarchyActivities(
      powerBranch,
      startLevel,
      endLevel,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
    );
  }

  /**
   * Dashboard stats (PUBLIC)
   */
  @Get('dashboard')
  
  async getDashboard() {
    return this.transparencyService.getDashboardStats();
  }

  /**
   * Export activity summary (PUBLIC)
   */
  @Get('export/summary')
  
  async exportSummary(
    @Query('orgArbanId') orgArbanId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('powerBranch') powerBranch?: PowerBranchType,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.activityService.generateActivitySummary({
      orgArbanId,
      startDate: start,
      endDate: end,
      powerBranch,
    });
  }
}

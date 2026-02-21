import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { TemplateService } from './template.service';
import { PowerBranchType, HierarchyLevel } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Transparency')
@Controller('activities')
export class ActivityController {
  constructor(
    private activityService: ActivityLogService,
    private templateService: TemplateService,
  ) {}

  /**
   * Log a new activity (requires auth - handled by global middleware)
   */
  @Post()
  async logActivity(
    @Body()
    body: {
      performedByUserId: string;
      templateId?: string;
      actionName: string;
      actionDescription: string;
      actionParameters: Record<string, any>;
      powerBranch: PowerBranchType;
      orgArbadId?: string;
      hierarchyLevel?: HierarchyLevel;
      durationMinutes?: number;
    },
  ) {
    return this.activityService.logActivity(body);
  }

  /**
   * Get GOST templates (public - no auth)
   */
  @Public()
  @Get('templates')
  async getTemplates(@Query('powerBranch') powerBranch?: PowerBranchType) {
    return this.templateService.getTemplates(powerBranch);
  }

  /**
   * Validate activity parameters against template
   */
  @Post('validate')
  async validateActivity(
    @Body() body: { templateId: string; parameters: Record<string, any> },
  ) {
    return this.templateService.validateActivity(body.templateId, body.parameters);
  }
}

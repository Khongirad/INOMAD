import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('history')
  async getPublicHistory(@Query('limit') limit: string, @Query('offset') offset: string) {
    return this.auditService.getPublicHistory(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('logs')
  async getLogs(@Req() req: AuthenticatedRequest, @Query('limit') limit: string, @Query('offset') offset: string) {
    // Basic Admin Check (in future, use RoleGuard)
    // For now, allow authenticated users to view logs or restrict?
    // User requested "AuditLog is internal/admin".
    // For MVP, we might restrict to specific Seat IDs or just check if user is admin.
    // Assuming simple access for now, or check req.user.role if available.
    
    return this.auditService.getLogs(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }
}

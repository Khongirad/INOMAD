import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorGuard } from '../auth/guards/creator.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== ADMIN + CREATOR ENDPOINTS ====================

  /**
   * Get dashboard statistics
   */
  @Get('stats')
  @UseGuards(AdminGuard)
  async getStats() {
    return this.adminService.getStats();
  }

  /**
   * List all users with filtering
   */
  @Get('users')
  @UseGuards(AdminGuard)
  async listUsers(
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listUsers({
      status,
      role,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Get pending verification users
   */
  @Get('users/pending')
  @UseGuards(AdminGuard)
  async getPendingUsers() {
    return this.adminService.getPendingUsers();
  }

  /**
   * Get user by ID
   */
  @Get('users/:userId')
  @UseGuards(AdminGuard)
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  /**
   * Verify a user
   */
  @Post('users/:userId/verify')
  @UseGuards(AdminGuard)
  async verifyUser(@Param('userId') userId: string, @Request() req) {
    return this.adminService.verifyUser(userId, req.user.userId);
  }

  /**
   * Reject a user
   */
  @Post('users/:userId/reject')
  @UseGuards(AdminGuard)
  async rejectUser(
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectUser(userId, reason);
  }
}

@Controller('creator')
@UseGuards(JwtAuthGuard, CreatorGuard)
export class CreatorController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== CREATOR-ONLY ENDPOINTS ====================

  /**
   * List all admin accounts
   */
  @Get('admins')
  async listAdmins() {
    return this.adminService.listAdmins();
  }

  /**
   * Create new admin account
   */
  @Post('admins')
  async createAdmin(
    @Body('seatId') seatId: string,
    @Request() req,
  ) {
    return this.adminService.createAdmin(seatId, req.user.userId);
  }

  /**
   * Freeze admin account
   */
  @Post('admins/:userId/freeze')
  async freezeAdmin(@Param('userId') userId: string, @Request() req) {
    return this.adminService.toggleFreezeAdmin(userId, req.user.userId, true);
  }

  /**
   * Unfreeze admin account
   */
  @Post('admins/:userId/unfreeze')
  async unfreezeAdmin(@Param('userId') userId: string, @Request() req) {
    return this.adminService.toggleFreezeAdmin(userId, req.user.userId, false);
  }

  /**
   * Remove admin privileges
   */
  @Delete('admins/:userId')
  async removeAdmin(@Param('userId') userId: string) {
    return this.adminService.removeAdmin(userId);
  }
}

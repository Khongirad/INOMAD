import { Controller, Post, Get, Put, Body, Param, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { BankHierarchyService } from './bank-hierarchy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @title BankHierarchyController
 * @notice REST API for bank hierarchy management
 * 
 * Endpoints:
 * - POST /bank/hierarchy/register - Register new employee
 * - GET /bank/hierarchy/employee/:seatId - Get employee details
 * - GET /bank/hierarchy/path/:employeeId - Get hierarchy path
 * - PUT /bank/hierarchy/performance/:employeeId - Update performance
 * - GET /bank/hierarchy/promotion/:employeeId - Check promotion eligibility
 */
@Controller('bank/hierarchy')
@UseGuards(JwtAuthGuard)
export class BankHierarchyController {
  constructor(
    private readonly hierarchyService: BankHierarchyService,
  ) {}

  /**
   * Register a new bank employee
   * POST /bank/hierarchy/register
   */
  @Post('register')
  async registerEmployee(@Body() body: {
    seatId: number;
    wallet: string;
    bankArbanId: number;
  }) {
    try {
      const employeeId = await this.hierarchyService.registerEmployee({
        seatId: body.seatId,
        wallet: body.wallet,
        bankArbanId: body.bankArbanId,
      });

      return {
        success: true,
        employeeId,
        message: 'Employee registered successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to register employee',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get employee details by seatId
   * GET /bank/hierarchy/employee/:seatId
   */
  @Get('employee/seat/:seatId')
  async getEmployeeBySeat(@Param('seatId') seatId: string) {
    try {
      // Convert seatId to employeeId lookup
      // This would require a mapping service or direct contract query
      // For now, returning a placeholder response structure
      
      return {
        success: true,
        employee: {
          seatId,
          message: 'Use employeeId endpoint for full details',
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Employee not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get employee details by employeeId
   * GET /bank/hierarchy/employee/:employeeId
   */
  @Get('employee/:employeeId')
  async getEmployee(@Param('employeeId') employeeId: string) {
    try {
      const employee = await this.hierarchyService.getEmployee(Number(employeeId));
      const hierarchy = await this.hierarchyService.getHierarchyPath(Number(employeeId));

      return {
        success: true,
        employee,
        hierarchy,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Employee not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get hierarchy path for employee
   * GET /bank/hierarchy/path/:employeeId
   */
  @Get('path/:employeeId')
  async getHierarchyPath(@Param('employeeId') employeeId: string) {
    try {
      const path = await this.hierarchyService.getHierarchyPath(Number(employeeId));

      return {
        success: true,
        path,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get hierarchy path',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Update employee performance score
   * PUT /bank/hierarchy/performance/:employeeId
   */
  @Put('performance/:employeeId')
  async updatePerformance(
    @Param('employeeId') employeeId: string,
    @Body() body: { score: number },
  ) {
    try {
      if (body.score < 0 || body.score > 100) {
        throw new Error('Performance score must be between 0 and 100');
      }

      await this.hierarchyService.updatePerformance(Number(employeeId), body.score);

      return {
        success: true,
        message: 'Performance updated successfully',
        employeeId: Number(employeeId),
        newScore: body.score,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update performance',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Check if employee can be promoted
   * GET /bank/hierarchy/promotion/:employeeId
   */
  @Get('promotion/:employeeId')
  async checkPromotion(@Param('employeeId') employeeId: string) {
    try {
      const canBePromoted = await this.hierarchyService.canBePromoted(Number(employeeId));

      return {
        success: true,
        employeeId: Number(employeeId),
        canBePromoted,
        requirement: 'Performance score >= 80',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to check promotion eligibility',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}

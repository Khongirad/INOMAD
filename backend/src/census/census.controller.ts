import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CensusService } from './census.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @controller CensusController
 * @description REST API for census and demographic data.
 *
 * Endpoints:
 * - GET /census/population - Population summary
 * - GET /census/gender - Gender distribution
 * - GET /census/age - Age distribution
 * - GET /census/ethnicity - Ethnicity breakdown
 * - GET /census/growth - Registration growth trends
 * - GET /census/report - Full census report
 */
@ApiTags('Census')
@Controller('census')
@UseGuards(JwtAuthGuard)
export class CensusController {
  constructor(private readonly censusService: CensusService) {}

  /**
   * Get population summary
   */
  @Get('population')
  async getPopulation() {
    const data = await this.censusService.getPopulationSummary();
    return { success: true, data };
  }

  /**
   * Get gender distribution
   */
  @Get('gender')
  async getGender() {
    const data = await this.censusService.getGenderDistribution();
    return { success: true, data };
  }

  /**
   * Get age distribution
   */
  @Get('age')
  async getAge() {
    const data = await this.censusService.getAgeDistribution();
    return { success: true, data };
  }

  /**
   * Get ethnicity breakdown
   */
  @Get('ethnicity')
  async getEthnicity() {
    const data = await this.censusService.getEthnicityDistribution();
    return { success: true, data };
  }

  /**
   * Get registration growth trends
   */
  @Get('growth')
  async getGrowth(@Query('months') months?: string) {
    const data = await this.censusService.getRegistrationGrowth(
      months ? parseInt(months) : 12,
    );
    return { success: true, data };
  }

  /**
   * Get full census report
   */
  @Get('report')
  async getReport() {
    const data = await this.censusService.getFullCensusReport();
    return { success: true, data };
  }
}

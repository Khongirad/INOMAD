import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { TempleOfHeavenService, SubmitRecordDto, VerifyRecordDto, DonationDto } from './temple.service';
import { RecordType } from '@prisma/client';

/**
 * @class TempleController
 * @description REST API for Temple of Heaven cultural archive
 */
@Controller('temple')
export class TempleController {
  private readonly logger = new Logger(TempleController.name);

  constructor(private readonly templeService: TempleOfHeavenService) {}

  /**
   * POST /temple/records
   * Submit a record to the Temple
   */
  @Post('records')
  async submitRecord(@Body() body: SubmitRecordDto) {
    try {
      const result = await this.templeService.submitRecord(body);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Submit record failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /temple/records/:id
   * Get a record by ID
   */
  @Get('records/:id')
  async getRecord(@Param('id') id: string) {
    try {
      const record = await this.templeService.getRecord(id);
      return { success: true, data: record };
    } catch (error) {
      this.logger.error(`Get record failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /temple/records?type=LIBRARY|ARCHIVE|CADASTRE
   * Get records by type
   */
  @Get('records')
  async getRecordsByType(@Query('type') type?: string) {
    try {
      if (type) {
        const records = await this.templeService.getRecordsByType(type as RecordType);
        return { success: true, data: records };
      }
      // Return all record types statistics
      const stats = await this.templeService.getStatistics();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error(`Get records failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /temple/records/:id/verify
   * Verify a record
   */
  @Post('records/:id/verify')
  async verifyRecord(@Param('id') id: string, @Body() body: VerifyRecordDto) {
    try {
      const result = await this.templeService.verifyRecord(id, body);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Verify record failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /temple/donate
   * Make a donation
   */
  @Post('donate')
  async donate(@Body() body: DonationDto) {
    try {
      const result = await this.templeService.makeDonation(body);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Donation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /temple/balance
   * Get donation balance
   */
  @Get('balance')
  async getBalance() {
    try {
      const balance = await this.templeService.getDonationBalance();
      return { success: true, data: balance };
    } catch (error) {
      this.logger.error(`Get balance failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /temple/statistics
   * Get Temple statistics
   */
  @Get('statistics')
  async getStatistics() {
    try {
      const stats = await this.templeService.getStatistics();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error(`Get statistics failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}

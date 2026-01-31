import { Controller, Post, Get, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TempleOfHeavenService, SubmitRecordDto, VerifyRecordDto, DonationDto } from './temple.service';

@Controller('temple')
export class TempleController {
  constructor(private readonly templeService: TempleOfHeavenService) {}

  // ============ Records ============

  @Post('records')
  async submitRecord(@Body() dto: SubmitRecordDto) {
    try {
      return await this.templeService.submitRecord(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('records/:id/verify')
  async verifyRecord(@Param('id') id: string, @Body() dto: VerifyRecordDto) {
    try {
      return await this.templeService.verifyRecord(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('records/:id')
  async getRecord(@Param('id') id: string) {
    try {
      return await this.templeService.getRecord(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('records/type/:type')
  async getRecordsByType(@Param('type') type: 'LIBRARY' | 'ARCHIVE' | 'CADASTRE') {
    try {
      return await this.templeService.getRecordsByType(type);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('records/submitter/:address')
  async getRecordsBySubmitter(@Param('address') address: string) {
    try {
      return await this.templeService.getRecordsBySubmitter(address);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ============ Donations ============

  @Post('donations')
  async makeDonation(@Body() dto: DonationDto) {
    try {
      return await this.templeService.makeDonation(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('donations/balance')
  async getDonationBalance() {
    try {
      return await this.templeService.getDonationBalance();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ============ Statistics ============

  @Get('statistics')
  async getStatistics() {
    try {
      return await this.templeService.getStatistics();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

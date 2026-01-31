import { Controller, Post, Get, Param, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { DigitalSealService, CreateSealDto, ApproveSealDto } from './digital-seal.service';

@Controller('digital-seal')
export class DigitalSealController {
  constructor(private readonly digitalSealService: DigitalSealService) {}

  @Post()
  async createSeal(@Body() dto: CreateSealDto) {
    try {
      return await this.digitalSealService.createSeal(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/approve')
  async approveSeal(
    @Param('id') id: string,
    @Body() dto: ApproveSealDto,
  ) {
    try {
      return await this.digitalSealService.approveSeal(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/revoke')
  async revokeSeal(
    @Param('id') id: string,
    @Body() dto: ApproveSealDto,
  ) {
    try {
      return await this.digitalSealService.revokeSeal(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/execute')
  async executeSeal(
    @Param('id') id: string,
    @Body() dto: ApproveSealDto,
  ) {
    try {
      return await this.digitalSealService.executeSeal(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async getSeal(@Param('id') id: string) {
    const seal = await this.digitalSealService.getSeal(id);
    if (!seal) {
      throw new HttpException('Seal not found', HttpStatus.NOT_FOUND);
    }
    return seal;
  }

  @Get(':id/status')
  async getSealStatus(@Param('id') id: string) {
    try {
      return await this.digitalSealService.getSealStatus(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('user/:seatId')
  async getSealsForUser(@Param('seatId') seatId: string) {
    return await this.digitalSealService.getSealsForUser(seatId);
  }
}

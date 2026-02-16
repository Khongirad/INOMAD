import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TaxService } from './tax.service';

@ApiTags('Tax')
@Controller('tax')
@UseGuards(AuthGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('generate/:year')
  async generateTaxRecord(
    @Request() req,
    @Param('year') year: string,
  ) {
    return this.taxService.generateTaxRecord(
      req.user.userId,
      parseInt(year),
    );
  }

  @Post(':id/file')
  async fileTaxReturn(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taxService.fileTaxReturn(req.user.userId, id);
  }

  @Post(':id/pay')
  async payTax(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taxService.payTax(req.user.userId, id);
  }

  @Get('history')
  async getTaxHistory(@Request() req) {
    return this.taxService.getTaxHistory(req.user.userId);
  }

  @Get(':id')
  async getTaxRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxService.getTaxRecord(id);
  }
}

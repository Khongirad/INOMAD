import { ApiTags } from '@nestjs/swagger';
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request 
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EventScope } from '@prisma/client';

@ApiTags('History')
@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get(':scope/:scopeId')
  async getHistory(
    @Param('scope') scope: EventScope,
    @Param('scopeId') scopeId: string,
    @Query('all') all?: string,
  ) {
    const publishedOnly = all !== 'true';
    return this.historyService.getHistory(scope, scopeId, publishedOnly);
  }

  @Post('record')
  async createRecord(@Request() req, @Body() body: any) {
    return this.historyService.createRecord({
      ...body,
      authorId: req.user.sub,
    });
  }

  @Put('record/:recordId')
  async updateRecord(
    @Param('recordId') recordId: string,
    @Request() req,
    @Body() body: any,
  ) {
    return this.historyService.updateRecord(recordId, req.user.sub, body);
  }

  @Delete('record/:recordId')
  async deleteRecord(@Param('recordId') recordId: string, @Request() req) {
    return this.historyService.deleteRecord(recordId, req.user.sub);
  }

  @Post('publish/:recordId')
  @UseGuards(AdminGuard)
  async publishRecord(@Param('recordId') recordId: string, @Request() req) {
    return this.historyService.publishRecord(recordId, req.user.sub);
  }

  @Get('narratives/:userId')
  async getUserNarratives(@Param('userId') userId: string) {
    return this.historyService.getUserNarratives(userId);
  }

  @Get('record/:recordId')
  async getRecord(@Param('recordId') recordId: string) {
    return this.historyService.getRecord(recordId);
  }
}

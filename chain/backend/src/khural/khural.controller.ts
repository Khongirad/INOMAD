import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { KhuralService } from './khural.service';
import { CreateKhuralGroupDto, ApplySeatDto, AssignSeatDto } from './dto/khural.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { Request } from '@nestjs/common';

@Controller('khural')
export class KhuralController {
  constructor(private khuralService: KhuralService) {}

  @Post()
  createGroup(@Body() dto: CreateKhuralGroupDto) {
    return this.khuralService.createGroup(dto);
  }

  @Get()
  listGroups(@Query('level') level?: string) {
    return this.khuralService.listGroups(level);
  }

  @Get(':id')
  getGroup(@Param('id') id: string) {
    return this.khuralService.getGroup(id);
  }

  @Post(':id/apply-seat')
  applySeat(
    @Param('id') groupId: string,
    @Body() dto: ApplySeatDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.khuralService.applySeat(groupId, dto.seatIndex, req.user.id);
  }

  @Post(':id/assign-seat')
  assignSeat(
    @Param('id') groupId: string,
    @Body() dto: AssignSeatDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.khuralService.assignSeat(
      groupId,
      dto.seatIndex,
      dto.userId,
      req.user.id,
    );
  }
}

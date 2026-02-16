import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Hierarchy')
@Controller('hierarchy')
@UseGuards(AuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  // ── TREE ──
  @Get('tree')
  async getTree() {
    return this.hierarchyService.getHierarchyTree();
  }

  // ── ZUNS ──
  @Get('zuns')
  async listZuns(@Query('myanganId') myanganId?: string) {
    return this.hierarchyService.listZuns(myanganId);
  }

  @Get('zuns/:id')
  async getZun(@Param('id') id: string) {
    return this.hierarchyService.getZun(id);
  }

  @Post('zuns/:zunId/join')
  async joinZun(@Param('zunId') zunId: string, @Body('arbanId') arbanId: string) {
    return this.hierarchyService.joinZun(BigInt(arbanId), zunId);
  }

  @Post('zuns/:zunId/leave')
  async leaveZun(@Body('arbanId') arbanId: string) {
    return this.hierarchyService.leaveZun(BigInt(arbanId));
  }

  // ── MYANGANS ──
  @Get('myangans')
  async listMyangans(@Query('tumenId') tumenId?: string) {
    return this.hierarchyService.listMyangans(tumenId);
  }

  @Get('myangans/:id')
  async getMyangan(@Param('id') id: string) {
    return this.hierarchyService.getMyangan(id);
  }

  @Post('myangans/:myanganId/join')
  async joinMyangan(@Param('myanganId') myanganId: string, @Body('zunId') zunId: string) {
    return this.hierarchyService.joinMyangan(zunId, myanganId);
  }

  // ── TUMENS ──
  @Get('tumens')
  async listTumens(@Query('republicId') republicId?: string) {
    return this.hierarchyService.listTumens(republicId);
  }

  @Get('tumens/:id')
  async getTumen(@Param('id') id: string) {
    return this.hierarchyService.getTumen(id);
  }

  @Post('tumens/:tumenId/join')
  async joinTumen(@Param('tumenId') tumenId: string, @Body('myanganId') myanganId: string) {
    return this.hierarchyService.joinTumen(myanganId, tumenId);
  }

  // ── TUMEN COOPERATION ──
  @Post('tumens/:tumenId/cooperate')
  async proposeCooperation(
    @Param('tumenId') tumenId: string,
    @Req() req: any,
    @Body() body: { targetTumenId: string; title: string; description?: string; treaty?: string },
  ) {
    return this.hierarchyService.proposeCooperation(tumenId, body.targetTumenId, req.user.id, body);
  }

  @Patch('cooperations/:id/respond')
  async respondToCooperation(
    @Param('id') id: string,
    @Req() req: any,
    @Body('accept') accept: boolean,
  ) {
    return this.hierarchyService.respondToCooperation(id, req.user.id, accept);
  }

  @Patch('cooperations/:id/dissolve')
  async dissolveCooperation(@Param('id') id: string, @Req() req: any) {
    return this.hierarchyService.dissolveCooperation(id, req.user.id);
  }

  @Get('tumens/:tumenId/cooperations')
  async listCooperations(@Param('tumenId') tumenId: string) {
    return this.hierarchyService.listCooperations(tumenId);
  }
}

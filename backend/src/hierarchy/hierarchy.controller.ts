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
  async listZuns(@Query('myangadId') myangadId?: string) {
    return this.hierarchyService.listZuns(myangadId);
  }

  @Get('zuns/:id')
  async getZun(@Param('id') id: string) {
    return this.hierarchyService.getZun(id);
  }

  @Post('zuns/:zunId/join')
  async joinZun(@Param('zunId') zunId: string, @Body('arbadId') arbadId: string) {
    return this.hierarchyService.joinZun(BigInt(arbadId), zunId);
  }

  @Post('zuns/:zunId/leave')
  async leaveZun(@Body('arbadId') arbadId: string) {
    return this.hierarchyService.leaveZun(BigInt(arbadId));
  }

  // ── MYANGADS ──
  @Get('myangads')
  async listMyangads(@Query('tumedId') tumedId?: string) {
    return this.hierarchyService.listMyangads(tumedId);
  }

  @Get('myangads/:id')
  async getMyangad(@Param('id') id: string) {
    return this.hierarchyService.getMyangad(id);
  }

  @Post('myangads/:myangadId/join')
  async joinMyangad(@Param('myangadId') myangadId: string, @Body('zunId') zunId: string) {
    return this.hierarchyService.joinMyangad(zunId, myangadId);
  }

  // ── TUMEDS ──
  @Get('tumeds')
  async listTumeds(@Query('republicId') republicId?: string) {
    return this.hierarchyService.listTumeds(republicId);
  }

  @Get('tumeds/:id')
  async getTumed(@Param('id') id: string) {
    return this.hierarchyService.getTumed(id);
  }

  @Post('tumeds/:tumedId/join')
  async joinTumed(@Param('tumedId') tumedId: string, @Body('myangadId') myangadId: string) {
    return this.hierarchyService.joinTumed(myangadId, tumedId);
  }

  // ── TUMED COOPERATION ──
  @Post('tumeds/:tumedId/cooperate')
  async proposeCooperation(
    @Param('tumedId') tumedId: string,
    @Req() req: any,
    @Body() body: { targetTumedId: string; title: string; description?: string; treaty?: string },
  ) {
    return this.hierarchyService.proposeCooperation(tumedId, body.targetTumedId, req.user.id, body);
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

  @Get('tumeds/:tumedId/cooperations')
  async listCooperations(@Param('tumedId') tumedId: string) {
    return this.hierarchyService.listCooperations(tumedId);
  }
}

import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProfessionsService } from './professions.service';
import { CreateProfessionDto } from './dto/professions.dto';

@ApiTags('Professions')
@Controller('professions')
export class ProfessionsController {
  constructor(private professionsService: ProfessionsService) {}

  @Post()
  createProfession(@Body() dto: CreateProfessionDto) {
    return this.professionsService.createProfession(dto);
  }

  @Get()
  listProfessions() {
    return this.professionsService.listProfessions();
  }

  @Get(':id')
  getProfession(@Param('id') id: string) {
    return this.professionsService.getProfession(id);
  }
}

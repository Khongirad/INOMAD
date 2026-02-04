import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { CouncilOfJusticeService, NominateMemberDto, ApproveMemberDto, FileCaseDto, AssignCaseDto, RuleOnCaseDto, RegisterPrecedentDto } from './justice.service';

@Controller('justice')
export class JusticeController {
  constructor(private readonly justiceService: CouncilOfJusticeService) {}

  // ============ Members ============

  @Post('members')
  async nominateMember(@Body() dto: NominateMemberDto) {
    try {
      return await this.justiceService.nominateMember(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('members/:id/approve')
  async approveMember(@Param('id') id: string, @Body() dto: ApproveMemberDto) {
    try {
      return await this.justiceService.approveMember(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('members/:id')
  async getMember(@Param('id') id: string) {
    try {
      return await this.justiceService.getMember(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('members/seat/:seatId')
  async getMemberBySeatId(@Param('seatId') seatId: string) {
    try {
      return await this.justiceService.getMemberBySeatId(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // ============ Cases ============

  @Post('cases')
  async fileCase(@Body() dto: FileCaseDto) {
    try {
      return await this.justiceService.fileCase(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('cases/:id/assign')
  async assignCase(@Param('id') id: string, @Body() dto: AssignCaseDto) {
    try {
      return await this.justiceService.assignCase(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('cases/:id/rule')
  async ruleOnCase(@Param('id') id: string, @Body() dto: RuleOnCaseDto) {
    try {
      return await this.justiceService.ruleOnCase(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('cases/:id')
  async getCase(@Param('id') id: string) {
    try {
      return await this.justiceService.getCase(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('cases/plaintiff/:seatId')
  async getCasesByPlaintiff(@Param('seatId') seatId: string) {
    try {
      return await this.justiceService.getCasesByPlaintiff(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('cases/defendant/:seatId')
  async getCasesByDefendant(@Param('seatId') seatId: string) {
    try {
      return await this.justiceService.getCasesByDefendant(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ============ Precedents ============

  @Post('precedents')
  async registerPrecedent(@Body() dto: RegisterPrecedentDto) {
    try {
      return await this.justiceService.registerPrecedent(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('precedents/:id')
  async getPrecedent(@Param('id') id: string) {
    try {
      return await this.justiceService.getPrecedent(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('precedents/case/:caseId')
  async getPrecedentsByCase(@Param('caseId') caseId: string) {
    try {
      return await this.justiceService.getPrecedentsByCase(Number(caseId));
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

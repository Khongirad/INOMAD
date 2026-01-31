import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AcademyOfSciencesService, SubmitPatentDto, ReviewPatentDto, RegisterDiscoveryDto, PeerReviewDto, RequestGrantDto, ApproveGrantDto } from './academy.service';

@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyOfSciencesService) {}

  // ============ Patents ============

  @Post('patents')
  async submitPatent(@Body() dto: SubmitPatentDto) {
    try {
      return await this.academyService.submitPatent(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('patents/:id/review')
  async reviewPatent(@Param('id') id: string, @Body() dto: ReviewPatentDto) {
    try {
      return await this.academyService.reviewPatent(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('patents/:id')
  async getPatent(@Param('id') id: string) {
    try {
      return await this.academyService.getPatent(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('patents/user/:seatId')
  async getPatentsBySubmitter(@Param('seatId') seatId: string) {
    try {
      return await this.academyService.getPatentsBySubmitter(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ============ Discoveries ============

  @Post('discoveries')
  async registerDiscovery(@Body() dto: RegisterDiscoveryDto) {
    try {
      return await this.academyService.registerDiscovery(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('discoveries/:id/review')
  async peerReviewDiscovery(@Param('id') id: string, @Body() dto: PeerReviewDto) {
    try {
      return await this.academyService.peerReviewDiscovery(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('discoveries/:id')
  async getDiscovery(@Param('id') id: string) {
    try {
      return await this.academyService.getDiscovery(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('discoveries/user/:seatId')
  async getDiscoveriesByScientist(@Param('seatId') seatId: string) {
    try {
      return await this.academyService.getDiscoveriesByScientist(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ============ Grants ============

  @Post('grants')
  async requestGrant(@Body() dto: RequestGrantDto) {
    try {
      return await this.academyService.requestGrant(dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('grants/:id/approve')
  async approveGrant(@Param('id') id: string, @Body() dto: ApproveGrantDto) {
    try {
      return await this.academyService.approveGrant(id, dto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('grants/:id')
  async getGrant(@Param('id') id: string) {
    try {
      return await this.academyService.getGrant(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('grants/user/:seatId')
  async getGrantsByScientist(@Param('seatId') seatId: string) {
    try {
      return await this.academyService.getGrantsByScientist(seatId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

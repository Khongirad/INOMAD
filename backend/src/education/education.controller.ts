import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EducationService } from './education.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EducationType } from '@prisma/client';

@Controller('education')
@UseGuards(JwtAuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  /**
   * Submit education verification
   */
  @Post('submit')
  async submitEducation(
    @Request() req,
    @Body() body: {
      type: EducationType;
      institution: string;
      fieldOfStudy: string;
      graduationYear?: number;
      documentHash?: string;
      documentUrl?: string;
      recommenderId?: string;
    }
  ) {
    return this.educationService.submitEducation({
      userId: req.user.id,
      ...body,
    });
  }

  /**
   * Admin: Verify education
   */
  @Post('verify/:id')
  async verifyEducation(
    @Request() req,
    @Param('id') verificationId: string,
    @Body() body: { validForGuilds?: string[] }
  ) {
    // TODO: Add admin role check
    return this.educationService.verifyEducation({
      verificationId,
      adminId: req.user.id,
      validForGuilds: body.validForGuilds,
    });
  }

  /**
   * Admin: Reject education verification
   */
  @Post('reject/:id')
  async rejectEducation(@Request() req, @Param('id') verificationId: string) {
    // TODO: Add admin role check
    return this.educationService.rejectEducation(verificationId, req.user.id);
  }

  /**
   * Get my education verifications
   */
  @Get('my')
  async getMyEducation(@Request() req) {
    return this.educationService.getUserEducation(req.user.id);
  }

  /**
   * Get user's education verifications (public)
   */
  @Get('user/:userId')
  async getUserEducation(@Param('userId') userId: string) {
    return this.educationService.getUserEducation(userId);
  }

  /**
   * Get pending verifications (admin only)
   */
  @Get('pending')
  async getPending() {
    // TODO: Add admin role check
    return this.educationService.getPendingVerifications();
  }

  /**
   * Get recommendations I've given
   */
  @Get('recommendations/given')
  async getRecommendationsGiven(@Request() req) {
    return this.educationService.getRecommendationsGiven(req.user.id);
  }

  /**
   * Get verified specialists in a field
   */
  @Get('specialists/:fieldOfStudy')
  async getSpecialists(@Param('fieldOfStudy') fieldOfStudy: string) {
    return this.educationService.getVerifiedSpecialists(fieldOfStudy);
  }

  /**
   * Check if user has verified education
   */
  @Get('check/:userId/:fieldOfStudy')
  async checkEducation(
    @Param('userId') userId: string,
    @Param('fieldOfStudy') fieldOfStudy: string
  ) {
    const hasEducation = await this.educationService.hasVerifiedEducation(
      userId,
      fieldOfStudy
    );
    return { hasEducation };
  }
}

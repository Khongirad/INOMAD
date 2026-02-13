import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * GET /onboarding/progress — Get current user's onboarding progress.
   */
  @Get('progress')
  async getProgress(@Req() req: any) {
    return this.onboardingService.getProgress(req.user.id);
  }

  /**
   * POST /onboarding/complete-step — Mark a step as completed.
   */
  @Post('complete-step')
  async completeStep(
    @Req() req: any,
    @Body() body: { stepKey: string },
  ) {
    return this.onboardingService.completeStep(req.user.id, body.stepKey);
  }

  /**
   * GET /onboarding/steps — Get all steps (for rendering the wizard).
   */
  @Get('steps')
  async getSteps() {
    return this.onboardingService.getStepsDefinition();
  }
}

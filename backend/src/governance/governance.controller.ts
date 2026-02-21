import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Public()
  @Get('summary')
  @ApiOperation({
    summary: 'Full governance state snapshot (public)',
    description:
      'Returns branch formation status, active CIK, election ladder, hot petitions, citizen stats. Cached on client side — poll every 30s.',
  })
  getSummary() {
    return this.governanceService.getSummary();
  }
}

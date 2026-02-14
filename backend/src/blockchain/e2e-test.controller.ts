import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from './blockchain.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * E2E Test Controller
 * Endpoints for running integration tests.
 * ONLY available when NODE_ENV !== 'production'.
 */
@Public()
@Controller('e2e')
export class E2ETestController {
  constructor(
    private e2eTestService: E2ETestService,
    private blockchainService: BlockchainService,
  ) {}

  /** Guard: block all requests in production */
  private ensureNotProduction() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('E2E endpoints are disabled in production');
    }
  }

  /**
   * Run all E2E tests
   * GET /api/e2e/run
   */
  @Get('run')
  async runAllTests(): Promise<any> {
    this.ensureNotProduction();
    return this.e2eTestService.runAllTests();
  }

  /**
   * Quick health check for blockchain
   * GET /api/e2e/health
   */
  @Get('health')
  async healthCheck() {
    this.ensureNotProduction();
    const isAvailable = this.blockchainService.isAvailable();
    
    let totalSeats = null;
    if (isAvailable) {
      try {
        totalSeats = await this.blockchainService.getTotalSeats();
      } catch (e) {
        // Ignore errors
      }
    }

    return {
      status: isAvailable ? 'connected' : 'offline',
      timestamp: new Date().toISOString(),
      blockchain: {
        available: isAvailable,
        totalSeats,
      },
    };
  }

  /**
   * Test specific contract
   * GET /api/e2e/contract/:name
   */
  @Get('contract/:name')
  async testContract() {
    this.ensureNotProduction();
    return { message: 'Not implemented yet' };
  }
}

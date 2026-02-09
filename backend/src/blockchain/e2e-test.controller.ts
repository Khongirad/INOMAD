import { Controller, Get } from '@nestjs/common';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from './blockchain.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * E2E Test Controller
 * Exposes PUBLIC endpoints for running integration tests
 * NO AUTH required - for testing purposes only
 */
@Public()
@Controller('e2e')
export class E2ETestController {
  constructor(
    private e2eTestService: E2ETestService,
    private blockchainService: BlockchainService,
  ) {}

  /**
   * Run all E2E tests
   * GET /api/e2e/run
   */
  @Get('run')
  async runAllTests(): Promise<any> {
    return this.e2eTestService.runAllTests();
  }

  /**
   * Quick health check for blockchain
   * GET /api/e2e/health
   */
  @Get('health')
  async healthCheck() {
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
    // Placeholder for specific contract tests
    return { message: 'Not implemented yet' };
  }
}

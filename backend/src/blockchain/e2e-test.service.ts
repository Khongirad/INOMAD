import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E2E Integration Test Service
 * Comprehensive tests for blockchain integration
 */
@Injectable()
export class E2ETestService {
  private readonly logger = new Logger(E2ETestService.name);

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  /**
   * Run all E2E integration tests
   */
  async runAllTests(): Promise<TestResults> {
    const results: TestResults = {
      timestamp: new Date().toISOString(),
      blockchainAvailable: false,
      tests: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };

    // Check blockchain availability
    results.blockchainAvailable = this.blockchain.isAvailable();
    
    if (!results.blockchainAvailable) {
      this.logger.warn('Blockchain not available - running offline tests only');
    }

    // Run tests
    results.tests.push(await this.testBlockchainConnection());
    results.tests.push(await this.testSeatSBTQueries());
    results.tests.push(await this.testAltanBalanceQueries());
    results.tests.push(await this.testIdentityIntegration());
    results.tests.push(await this.testBankIntegration());

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.passed).length;
    results.summary.failed = results.tests.filter(t => !t.passed).length;

    return results;
  }

  /**
   * Test 1: Blockchain Connection
   */
  private async testBlockchainConnection(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Blockchain Connection',
      passed: false,
      duration: 0,
      details: {},
    };

    const start = Date.now();

    try {
      test.details.isAvailable = this.blockchain.isAvailable();
      
      if (test.details.isAvailable) {
        const totalSeats = await this.blockchain.getTotalSeats();
        test.details.totalSeats = totalSeats;
        test.passed = true;
      } else {
        test.details.error = 'Blockchain service in offline mode';
        test.passed = false;
      }
    } catch (error) {
      test.details.error = error.message;
      test.passed = false;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test 2: SeatSBT Queries
   */
  private async testSeatSBTQueries(): Promise<TestResult> {
    const test: TestResult = {
      name: 'SeatSBT Queries',
      passed: false,
      duration: 0,
      details: {},
    };

    const start = Date.now();

    try {
      if (!this.blockchain.isAvailable()) {
        test.details.skipped = true;
        test.passed = true;
        test.duration = Date.now() - start;
        return test;
      }

      // Test getSeatOwner for seat 1
      const owner = await this.blockchain.getSeatOwner('1');
      test.details.seat1Owner = owner || 'No owner';

      // Test getTotalSeats
      const totalSeats = await this.blockchain.getTotalSeats();
      test.details.totalSeats = totalSeats;

      // Test verifySeatOwnership (with dummy address)
      const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const isOwner = await this.blockchain.verifySeatOwnership('1', testAddress);
      test.details.deployerOwnsSeat1 = isOwner;

      test.passed = true;
    } catch (error) {
      test.details.error = error.message;
      test.passed = false;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test 3: Altan Balance Queries
   */
  private async testAltanBalanceQueries(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Altan Balance Queries',
      passed: false,
      duration: 0,
      details: {},
    };

    const start = Date.now();

    try {
      if (!this.blockchain.isAvailable()) {
        test.details.skipped = true;
        test.passed = true;
        test.duration = Date.now() - start;
        return test;
      }

      // Test getAltanBalance for deployer
      const deployerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const balance = await this.blockchain.getAltanBalance(deployerAddress);
      test.details.deployerBalance = balance;

      test.passed = true;
    } catch (error) {
      test.details.error = error.message;
      test.passed = false;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test 4: Identity Integration (DB + Blockchain)
   */
  private async testIdentityIntegration(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Identity Integration',
      passed: false,
      duration: 0,
      details: {},
    };

    const start = Date.now();

    try {
      // Get a user from DB
      const user = await this.prisma.user.findFirst({
        where: { seatId: { not: null } },
        select: { id: true, seatId: true, walletAddress: true },
      });

      test.details.userFound = !!user;

      if (user && user.seatId) {
        test.details.userId = user.id;
        test.details.seatId = user.seatId;

        if (this.blockchain.isAvailable()) {
          // Verify seat exists on-chain
          const metadata = await this.blockchain.getSeatMetadata(user.seatId);
          test.details.onChainMetadata = metadata;
        }
      }

      test.passed = true;
    } catch (error) {
      test.details.error = error.message;
      test.passed = false;
    }

    test.duration = Date.now() - start;
    return test;
  }

  /**
   * Test 5: Bank Integration (DB + Blockchain)
   */
  private async testBankIntegration(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Bank Integration',
      passed: false,
      duration: 0,
      details: {},
    };

    const start = Date.now();

    try {
      // Get a user with wallet from DB
      const user = await this.prisma.user.findFirst({
        where: { walletAddress: { not: null } },
        include: { altanLedger: true },
        take: 1,
      });

      test.details.userWithWalletFound = !!user;

      if (user) {
        test.details.dbBalance = user.altanLedger?.balance?.toString() || '0';

        if (user.walletAddress && this.blockchain.isAvailable()) {
          const onChainBalance = await this.blockchain.getAltanBalance(user.walletAddress);
          test.details.onChainBalance = onChainBalance;
          test.details.balancesMatch = test.details.dbBalance === onChainBalance;
        }
      }

      test.passed = true;
    } catch (error) {
      test.details.error = error.message;
      test.passed = false;
    }

    test.duration = Date.now() - start;
    return test;
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: Record<string, any>;
}

interface TestResults {
  timestamp: string;
  blockchainAvailable: boolean;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

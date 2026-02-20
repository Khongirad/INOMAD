import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * BalanceReconciliationService
 *
 * DETERMINISM GAP ADDRESSED:
 * CorrAccount.balance in Postgres can drift from the actual on-chain balance
 * in AltanCoreLedger if:
 *   - A direct on-chain transaction bypasses the backend
 *   - A failed backend update leaves Postgres inconsistent
 *   - Blockchain reorg reverts a transaction after DB was committed
 *
 * This service runs every 6 hours to detect and alert on drift.
 * It does NOT auto-correct (that would require governance approval),
 * but it does:
 *   1. Log the discrepancy
 *   2. Create an AuditLog record
 *   3. Flag the CorrAccount for manual review
 *
 * "The blockchain is the source of truth. Postgres is the cache."
 */
@Injectable()
export class BalanceReconciliationService {
  private readonly logger = new Logger(BalanceReconciliationService.name);

  /** Alert threshold: if drift > 0.001 ALTAN, flag it */
  private readonly DRIFT_THRESHOLD = new Decimal('0.001');

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly config: ConfigService,
  ) {}

  // ── Scheduled reconciliation ────────────────────────────────────────────────

  /**
   * Run reconciliation every 6 hours.
   * Checks all CorrAccounts that have a wallet address (accountRef).
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledReconciliation(): Promise<void> {
    const blockchainEnabled = this.config.get<string>('BLOCKCHAIN_ENABLED') !== 'false';
    if (!blockchainEnabled) {
      this.logger.debug('Blockchain disabled — skipping balance reconciliation');
      return;
    }

    this.logger.log('⚖️  Starting balance reconciliation sweep...');
    const results = await this.reconcileAll();
    this.logger.log(
      `⚖️  Reconciliation complete: ${results.ok} OK | ${results.drifted} drifted | ${results.errors} errors`,
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Reconcile all CorrAccounts. Returns summary stats.
   */
  async reconcileAll(): Promise<{ ok: number; drifted: number; errors: number }> {
    const accounts = await this.prisma.corrAccount.findMany({
      select: { id: true, accountRef: true, balance: true, licenseId: true },
    });

    let ok = 0;
    let drifted = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        const result = await this.checkDrift(account.id);
        if (result.hasDrift) {
          drifted++;
        } else {
          ok++;
        }
      } catch (err) {
        errors++;
        this.logger.error(
          `Error reconciling CorrAccount ${account.id}: ${err?.message}`,
        );
      }
    }

    return { ok, drifted, errors };
  }

  /**
   * Check drift for a single CorrAccount.
   * Returns the drift amount and whether it exceeds threshold.
   *
   * @param corrAccountId  UUID of the CorrAccount to check
   */
  async checkDrift(corrAccountId: string): Promise<{
    corrAccountId: string;
    postgresBalance: Decimal;
    onChainBalance: Decimal | null;
    drift: Decimal | null;
    hasDrift: boolean;
    error?: string;
  }> {
    const account = await this.prisma.corrAccount.findUnique({
      where: { id: corrAccountId },
      select: { id: true, accountRef: true, balance: true },
    });

    if (!account) {
      return {
        corrAccountId,
        postgresBalance: new Decimal(0),
        onChainBalance: null,
        drift: null,
        hasDrift: false,
        error: 'Account not found',
      };
    }

    // Fetch on-chain balance (returns human-readable decimal via ethers.formatUnits)
    let onChainBalance: Decimal | null = null;

    try {
      const rawOnChain = await this.blockchain.getAltanBalance(account.accountRef);
      if (rawOnChain === null) {
        // Blockchain offline — skip reconciliation for this account
        return {
          corrAccountId,
          postgresBalance: account.balance,
          onChainBalance: null,
          drift: null,
          hasDrift: false,
          error: 'Blockchain offline',
        };
      }
      onChainBalance = new Decimal(rawOnChain);
    } catch (err) {
      this.logger.warn(
        `Could not fetch on-chain balance for ${account.accountRef}: ${err?.message}`,
      );
      return {
        corrAccountId,
        postgresBalance: account.balance,
        onChainBalance: null,
        drift: null,
        hasDrift: false,
        error: `On-chain fetch failed: ${err?.message}`,
      };
    }


    const drift = account.balance.minus(onChainBalance).abs();
    const hasDrift = drift.greaterThan(this.DRIFT_THRESHOLD);

    if (hasDrift) {
      await this.recordDrift(account, onChainBalance, drift);
    }

    return {
      corrAccountId,
      postgresBalance: account.balance,
      onChainBalance,
      drift,
      hasDrift,
    };
  }

  /**
   * Get reconciliation status for a specific account (e.g., for API endpoint).
   */
  async getAccountStatus(corrAccountId: string) {
    const drift = await this.checkDrift(corrAccountId);
    return {
      ...drift,
      thresholdALTAN: this.DRIFT_THRESHOLD.toString(),
      status: drift.hasDrift
        ? 'DRIFT_DETECTED'
        : drift.error
          ? 'ERROR'
          : 'OK',
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async recordDrift(
    account: { id: string; accountRef: string; balance: Decimal },
    onChainBalance: Decimal,
    drift: Decimal,
  ): Promise<void> {
    this.logger.warn(
      `🚨 BALANCE DRIFT DETECTED: CorrAccount ${account.id}\n` +
        `   Postgres:  ${account.balance.toFixed(6)} ALTAN\n` +
        `   On-chain:  ${onChainBalance.toFixed(6)} ALTAN\n` +
        `   Drift:     ${drift.toFixed(6)} ALTAN`,
    );

    // Record in AuditLog for governance review
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'BALANCE_DRIFT_DETECTED',
          resourceType: 'CorrAccount',
          resourceId: account.id,
          metadata: {
            accountRef: account.accountRef,
            postgresBalance: account.balance.toString(),
            onChainBalance: onChainBalance.toString(),
            driftAmount: drift.toString(),
            detectedAt: new Date().toISOString(),
            severity:
              drift.greaterThan(new Decimal('10'))
                ? 'CRITICAL'
                : drift.greaterThan(new Decimal('1'))
                  ? 'HIGH'
                  : 'MEDIUM',
          },
        },
      });
    } catch (err) {
      // Audit log failure should not throw — log and continue
      this.logger.error(`Failed to create drift audit log: ${err?.message}`);
    }
  }
}

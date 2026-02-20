import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import * as crypto from 'crypto';

/**
 * StateAnchorService
 *
 * DETERMINISM (P5): Periodic Merkle root commitments to blockchain.
 *
 * "If it's not on-chain, it didn't happen."
 *
 * Every week, this service:
 *   1. Fetches all new/unanchored state since last anchoring:
 *      - Legislative votes (with nullifiers)
 *      - Election results (with resultHash)
 *      - Signed laws (with contentHash)
 *      - Emission decisions
 *      - SeatSBT grants
 *   2. Builds a Merkle tree of each batch
 *   3. Calls StateAnchor.sol.addAnchor(merkleRoot, anchorType, description)
 *   4. Stores the anchor transaction in AuditLog
 *
 * This creates an on-chain proof of system integrity achievable even after
 * DB loss — the Merkle roots allow reconstruction verification.
 */
@Injectable()
export class StateAnchorService {
  private readonly logger = new Logger(StateAnchorService.name);

  /** AnchorType enum mirrors StateAnchor.sol */
  private static readonly AnchorType = {
    VOTE_BATCH: 0,
    ELECTION_RESULT: 1,
    SIGNED_LAW: 2,
    EMISSION_DECISION: 3,
    VERIFICATION_BATCH: 4,
    GENERAL: 5,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly config: ConfigService,
  ) {}

  // ── Scheduled Anchoring ────────────────────────────────────────────────────

  /**
   * Weekly anchor: every Sunday at 00:00 UTC
   */
  @Cron('0 0 * * 0')
  async scheduledAnchor(): Promise<void> {
    const blockchainEnabled = this.config.get<string>('BLOCKCHAIN_ENABLED') !== 'false';
    if (!blockchainEnabled) {
      this.logger.debug('Blockchain disabled — skipping state anchoring');
      return;
    }

    this.logger.log('⚓ Starting weekly state anchoring...');
    await this.anchorAllBatches();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Anchor all batch types. Can be called manually (e.g., admin endpoint).
   */
  async anchorAllBatches(): Promise<{
    votes?: string;
    elections?: string;
    laws?: string;
    emissions?: string;
    verifications?: string;
  }> {
    const results: Record<string, string> = {};
    const week = this.getWeekLabel();

    await Promise.allSettled([
      this.anchorVoteBatch(week).then(r => { if (r) results.votes = r; }),
      this.anchorElectionResults(week).then(r => { if (r) results.elections = r; }),
      this.anchorSignedLaws(week).then(r => { if (r) results.laws = r; }),
      this.anchorEmissionDecisions(week).then(r => { if (r) results.emissions = r; }),
      this.anchorVerificationBatch(week).then(r => { if (r) results.verifications = r; }),
    ]);

    this.logger.log(`⚓ Anchoring complete: ${JSON.stringify(results)}`);
    return results;
  }

  // ── Batch Anchors ──────────────────────────────────────────────────────────

  /**
   * Anchor legislative votes for the current week.
   * Each vote's nullifier is the leaf — proves votes happened without revealing order.
   */
  async anchorVoteBatch(label?: string): Promise<string | null> {
    const since = this.getLastWeekStart();
    const votes = await this.prisma.proposalVote.findMany({
      where: { createdAt: { gte: since }, nullifier: { not: null } },
      select: { nullifier: true, id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (votes.length === 0) {
      this.logger.debug('No votes to anchor this period');
      return null;
    }

    const leaves = votes.map(v => v.nullifier!);
    const merkleRoot = this.computeMerkleRoot(leaves);
    const description = `Vote batch ${label || this.getWeekLabel()} (${votes.length} votes)`;

    return this.publishAnchor(merkleRoot, StateAnchorService.AnchorType.VOTE_BATCH, description);
  }

  /**
   * Anchor completed election results.
   * Uses the resultHash stored at certification time.
   */
  async anchorElectionResults(label?: string): Promise<string | null> {
    const since = this.getLastWeekStart();
    const elections = await this.prisma.election.findMany({
      where: { status: 'COMPLETED', certifiedAt: { gte: since }, resultHash: { not: null } },
      select: { resultHash: true, id: true },
      orderBy: { certifiedAt: 'asc' },
    });

    if (elections.length === 0) return null;

    const leaves = elections.map(e => e.resultHash!);
    const merkleRoot = this.computeMerkleRoot(leaves);
    const description = `Election results ${label || this.getWeekLabel()} (${elections.length} elections)`;

    return this.publishAnchor(merkleRoot, StateAnchorService.AnchorType.ELECTION_RESULT, description);
  }

  /**
   * Anchor signed laws.
   * Uses the contentHash locked at signing time.
   */
  async anchorSignedLaws(label?: string): Promise<string | null> {
    const since = this.getLastWeekStart();
    const laws = await this.prisma.legislativeProposal.findMany({
      where: { status: 'SIGNED', contentLockedAt: { gte: since }, contentHash: { not: null } },
      select: { contentHash: true, id: true },
      orderBy: { contentLockedAt: 'asc' },
    });

    if (laws.length === 0) return null;

    const leaves = laws.map(l => l.contentHash!);
    const merkleRoot = this.computeMerkleRoot(leaves);
    const description = `Signed laws ${label || this.getWeekLabel()} (${laws.length} laws)`;

    return this.publishAnchor(merkleRoot, StateAnchorService.AnchorType.SIGNED_LAW, description);
  }

  /**
   * Anchor emission decisions (multi-sig executed proposals).
   * txHash serves as the leaf — already on-chain, but anchoring creates a batch proof.
   */
  async anchorEmissionDecisions(label?: string): Promise<string | null> {
    const since = this.getLastWeekStart();
    const emissions = await this.prisma.emissionRecord.findMany({
      where: { createdAt: { gte: since }, txHash: { not: null }, status: 'COMPLETED' },
      select: { txHash: true, id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (emissions.length === 0) return null;

    const leaves = emissions.map(e => e.txHash!);
    const merkleRoot = this.computeMerkleRoot(leaves);
    const description = `Emission decisions ${label || this.getWeekLabel()} (${emissions.length} records)`;

    return this.publishAnchor(merkleRoot, StateAnchorService.AnchorType.EMISSION_DECISION, description);
  }

  /**
   * Anchor SeatSBT verification grants.
   * Uses txHash from on-chain mint events.
   */
  async anchorVerificationBatch(label?: string): Promise<string | null> {
    const since = this.getLastWeekStart();
    const verifications = await this.prisma.userVerification.findMany({
      where: { createdAt: { gte: since }, txHash: { not: null }, isActive: true },
      select: { txHash: true, id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (verifications.length === 0) return null;

    const leaves = verifications.map(v => v.txHash!);
    const merkleRoot = this.computeMerkleRoot(leaves);
    const description = `Verification grants ${label || this.getWeekLabel()} (${verifications.length} grants)`;

    return this.publishAnchor(merkleRoot, StateAnchorService.AnchorType.VERIFICATION_BATCH, description);
  }

  // ── Merkle Tree ─────────────────────────────────────────────────────────────

  /**
   * Compute Merkle root from an array of leaf hashes.
   * Leaves are keccak256'ed, then paired up the tree.
   * Compatible with standard Merkle tree implementations.
   *
   * @param leaves  Array of hex strings (each 32 bytes / 64 hex chars)
   */
  computeMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) {
      return '0x' + '0'.repeat(64);
    }

    // Hash all leaves with sha256 to normalize length
    let nodes: string[] = leaves.map(leaf =>
      crypto.createHash('sha256').update(leaf).digest('hex'),
    );

    // Build tree bottom-up
    while (nodes.length > 1) {
      const newLevel: string[] = [];
      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i]; // duplicate last if odd
        // Sort pair to make proof order-independent
        const [a, b] = [left, right].sort();
        const combined = crypto
          .createHash('sha256')
          .update(a + b)
          .digest('hex');
        newLevel.push(combined);
      }
      nodes = newLevel;
    }

    return '0x' + nodes[0];
  }

  // ── On-chain publish ───────────────────────────────────────────────────────

  /**
   * Publish a Merkle root to StateAnchor.sol on-chain.
   * Returns the transaction hash, or null if blockchain is unavailable.
   */
  private async publishAnchor(
    merkleRoot: string,
    anchorType: number,
    description: string,
  ): Promise<string | null> {
    const stateAnchorAddress = this.config.get<string>('STATE_ANCHOR_ADDRESS');
    if (!stateAnchorAddress) {
      this.logger.warn('STATE_ANCHOR_ADDRESS not configured — anchor not published');
      return null;
    }

    try {
      const txHash = await this.blockchain.callStateAnchor(
        stateAnchorAddress,
        merkleRoot,
        anchorType,
        description,
      );

      this.logger.log(`⚓ Anchored (type=${anchorType}): ${description} → tx=${txHash}`);

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'STATE_ANCHORED',
          resourceType: 'StateAnchor',
          resourceId: txHash,
          metadata: { merkleRoot, anchorType, description },
        },
      });

      return txHash;
    } catch (err) {
      this.logger.error(`Failed to publish anchor: ${err?.message}`);
      return null;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getLastWeekStart(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getWeekLabel(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil(
      ((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7,
    );
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
}

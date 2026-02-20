import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';

export interface SeatMintResult {
  txHash: string;
  tokenId: bigint;
  blockNumber: bigint;
}

/**
 * OnChainVerificationService
 *
 * Bridges the backend verification system to the SeatSBT smart contract.
 * Called after a guarantor confirms a citizen's identity — mints a non-transferable
 * Soul-Bound Token (SBT) on-chain as immutable proof of verified citizenship.
 *
 * If the citizen has no walletAddress yet (MPC wallet not set up), the mint
 * is skipped and the verification is recorded as off-chain only. The SBT
 * can be claimed later via `claimSeat()`.
 */
@Injectable()
export class OnChainVerificationService {
  private readonly logger = new Logger(OnChainVerificationService.name);

  constructor(private readonly blockchain: BlockchainService) {}

  /**
   * Mint a SeatSBT for a newly verified citizen.
   *
   * @param walletAddress - The citizen's on-chain wallet address
   * @param seatId        - The citizen's human-readable Seat ID (e.g. "KHURAL-AB12CD34")
   * @returns txHash, tokenId, blockNumber
   */
  async mintSeatForCitizen(
    walletAddress: string,
    seatId: string,
  ): Promise<SeatMintResult | null> {
    if (!walletAddress) {
      this.logger.warn(
        `[SeatSBT] Skipping on-chain mint for seatId=${seatId}: no walletAddress configured`,
      );
      return null;
    }

    try {
      this.logger.log(
        `⛓️  Minting SeatSBT for seatId=${seatId} → wallet=${walletAddress.slice(0, 10)}…`,
      );

      const result = await this.blockchain.mintSeatSBT(walletAddress, seatId);

      this.logger.log(
        `✅ SeatSBT minted: tokenId=${result.tokenId}, txHash=${result.txHash}, block=${result.blockNumber}`,
      );

      return {
        txHash: result.txHash,
        tokenId: BigInt(result.tokenId),
        blockNumber: BigInt(result.blockNumber),
      };
    } catch (err) {
      // Non-fatal: verification is still valid off-chain.
      // The SBT can be minted later when wallet is set up.
      this.logger.error(
        `⚠️  SeatSBT mint failed for ${seatId}: ${err?.message || err}. Verification recorded off-chain only.`,
      );
      return null;
    }
  }

  /**
   * Check if a wallet already holds a SeatSBT.
   */
  async hasSeatSBT(walletAddress: string): Promise<boolean> {
    try {
      return await this.blockchain.hasSeatSBT(walletAddress);
    } catch {
      return false;
    }
  }

  /**
   * Revoke a SeatSBT (admin action — e.g., fraud, ban).
   */
  async revokeSeat(tokenId: bigint, reason: string): Promise<string | null> {
    try {
      const result = await this.blockchain.revokeSeatSBT(tokenId, reason);
      this.logger.log(`🚫 SeatSBT tokenId=${tokenId} revoked: txHash=${result.txHash}`);
      return result.txHash;
    } catch (err) {
      this.logger.error(`Failed to revoke SeatSBT tokenId=${tokenId}: ${err?.message}`);
      return null;
    }
  }
}

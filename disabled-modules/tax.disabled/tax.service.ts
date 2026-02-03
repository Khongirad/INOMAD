import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ethers } from 'ethers';

export interface TaxQuote {
  totalTax: string;
  republicTax: string;
  confederationTax: string;
  taxRate: number; // 10%
}

export interface TaxStats {
  taxRate: number;
  republicShare: number; // 7%
  confederationShare: number; // 3%
}

/**
 * Tax Service
 * Integrates with TaxEngine.sol contract
 */
@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly blockchain: BlockchainService) {}

  /**
   * Quote tax for an amount
   * @param amount Amount in ALTAN (as string)
   * @returns Tax breakdown
   */
  async quoteTax(amount: string): Promise<TaxQuote> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);

      // Call quoteTax
      const [republicTax, confedTax] = await taxEngine.quoteTax(amountWei);

      const totalTax = republicTax + confedTax;

      return {
        totalTax: ethers.formatEther(totalTax),
        republicTax: ethers.formatEther(republicTax),
        confederationTax: ethers.formatEther(confedTax),
        taxRate: 10, // 10% constant
      };
    } catch (error) {
      this.logger.error('Failed to quote tax:', error);
      throw error;
    }
  }

  /**
   * Collect tax from payer account
   * @param payerAccountId Payer's account ID (bytes32)
   * @param republicKey Republic key (bytes32)
   * @param asset Asset address (ALTAN token)
   * @param amount Amount to tax
   * @param privateKey Private key of collector
   * @returns Transaction hash
   */
  async collectTax(
    payerAccountId: string,
    republicKey: string,
    asset: string,
    amount: string,
    privateKey: string,
  ): Promise<string> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      const wallet = new ethers.Wallet(
        privateKey,
        this.blockchain.getProvider(),
      );
      const contractWithSigner = taxEngine.connect(wallet);

      const amountWei = ethers.parseEther(amount);
      const memo = ethers.encodeBytes32String('Tax Collection');

      const tx = await contractWithSigner.collectTax(
        payerAccountId,
        republicKey,
        asset,
        amountWei,
        memo,
      );

      await tx.wait();

      this.logger.log(`Tax collected: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Failed to collect tax:', error);
      throw error;
    }
  }

  /**
   * Get tax statistics
   */
  async getTaxStats(): Promise<TaxStats> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();

      const TAX_BPS = await taxEngine.TAX_BPS();
      const REPUBLIC_BPS = await taxEngine.REPUBLIC_BPS();
      const CONFED_BPS = await taxEngine.CONFED_BPS();

      return {
        taxRate: TAX_BPS.toNumber() / 100, // Convert bps to percentage
        republicShare: REPUBLIC_BPS.toNumber() / 100,
        confederationShare: CONFED_BPS.toNumber() / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get tax stats:', error);
      throw error;
    }
  }

  /**
   * Get confederation account ID
   */
  async getConfederationAccountId(): Promise<string> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      return await taxEngine.confederationAccountId();
    } catch (error) {
      this.logger.error('Failed to get confederation account:', error);
      throw error;
    }
  }

  /**
   * Get republic account ID by key
   */
  async getRepublicAccountId(republicKey: string): Promise<string> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      return await taxEngine.republicAccountIdOf(republicKey);
    } catch (error) {
      this.logger.error('Failed to get republic account:', error);
      throw error;
    }
  }

  /**
   * Set republic account (admin only)
   */
  async setRepublic(
    republicKey: string,
    republicAccountId: string,
    privateKey: string,
  ): Promise<string> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      const wallet = new ethers.Wallet(
        privateKey,
        this.blockchain.getProvider(),
      );
      const contractWithSigner = taxEngine.connect(wallet);

      const tx = await contractWithSigner.setRepublic(
        republicKey,
        republicAccountId,
      );
      await tx.wait();

      this.logger.log(`Republic set: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Failed to set republic:', error);
      throw error;
    }
  }

  /**
   * Set collector permissions (admin only)
   */
  async setCollector(
    collectorAddress: string,
    allowed: boolean,
    privateKey: string,
  ): Promise<string> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      const wallet = new ethers.Wallet(
        privateKey,
        this.blockchain.getProvider(),
      );
      const contractWithSigner = taxEngine.connect(wallet);

      const tx = await contractWithSigner.setCollector(
        collectorAddress,
        allowed,
      );
      await tx.wait();

      this.logger.log(
        `Collector ${allowed ? 'added' : 'removed'}: ${tx.hash}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error('Failed to set collector:', error);
      throw error;
    }
  }

  /**
   * Check if address is a collector
   */
  async isCollector(address: string): Promise<boolean> {
    try {
      const taxEngine = this.blockchain.getTaxEngineContract();
      return await taxEngine.isCollector(address);
    } catch (error) {
      this.logger.error('Failed to check collector:', error);
      throw error;
    }
  }
}

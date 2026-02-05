import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { ArbanCreditLine_ABI, CreditType } from '../blockchain/abis/arbanCreditLine.abi';
import { ArbanCreditLine__factory } from '../typechain-types/factories/ArbanCreditLine__factory';
import {
  CreditLine,
  Loan,
  CreditDashboard,
  OpenCreditLineRequest,
  BorrowRequest,
  BorrowResponse,
  RepayLoanRequest,
} from './types/arban.types';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);
  private contract: ReturnType<typeof ArbanCreditLine__factory.connect>;

  constructor(private readonly prisma: PrismaService) {
    const contractAddress = process.env.ARBAN_CREDIT_LINE_ADDRESS || '';
    
    if (contractAddress && contractAddress !== '') {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
      this.contract = ArbanCreditLine__factory.connect(contractAddress, provider);  
      this.logger.log(`✅ CreditService connected to contract`);
    } else {
      this.logger.warn('⚠️  ARBAN_CREDIT_LINE_ADDRESS not configured - Credit line blockchain features disabled');
      // @ts-ignore
      this.contract = null;
    }
  }

  // ==================== FAMILY CREDIT ====================

  /**
   * Open Family credit line
   */
  async openFamilyCreditLine(
    arbanId: number,
    signerWallet: ethers.Wallet,
  ): Promise<CreditLine> {
    this.logger.log(`Opening Family credit line for arban ${arbanId}`);

    try {
      // Check if already exists
      const existing = await this.prisma.creditLine.findUnique({
        where: { arbanId: BigInt(arbanId) },
      });

      if (existing) {
        throw new BadRequestException('Credit line already exists for this arban');
      }

      // Verify Family Arban exists and is married
      const familyArban = await this.prisma.familyArban.findUnique({
        where: { arbanId: BigInt(arbanId) },
      });

      if (!familyArban || !familyArban.isActive) {
        throw new BadRequestException('Family Arban not found or inactive');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.openFamilyCreditLine(arbanId);
      await tx.wait();

      // Get credit line details from blockchain
      const onchainCreditLine = await this.contract.getFamilyCreditLine(arbanId);
      const [rating, limit, borrowed, available, isActive] = onchainCreditLine;

      // Store in database
      const creditLine = await this.prisma.creditLine.create({
        data: {
          arbanId: BigInt(arbanId),
          creditType: 'FAMILY',
          creditRating: Number(rating),
          creditLimit: limit.toString(),
          borrowed: borrowed.toString(),
          isActive,
        },
      });

      this.logger.log(`Family credit line opened successfully`);

      return this.mapCreditLine(creditLine);
    } catch (error) {
      this.logger.error(`Failed to open Family credit line: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Borrow from Family credit line
   */
  async borrowFamily(
    request: BorrowRequest,
    signerWallet: ethers.Wallet,
  ): Promise<BorrowResponse> {
    this.logger.log(
      `Borrowing ${request.amount} for Family arban ${request.arbanId}, ${request.durationDays} days`,
    );

    try {
      // Verify credit line exists
      const creditLine = await this.prisma.creditLine.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
      });

      if (!creditLine || creditLine.creditType !== 'FAMILY') {
        throw new NotFoundException('Family credit line not found');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const amount = ethers.parseUnits(request.amount, 6); // ALTAN has 6 decimals
      const tx = await contractWithSigner.borrowFamily(
        request.arbanId,
        amount,
        request.durationDays,
      );
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'LoanTaken';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('LoanTaken event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const loanId = parsedEvent?.args.loanId;

      // Calculate interest
      const interestRateBps = await this.contract.interestRateBps();
      const interest =
        (BigInt(amount) * BigInt(interestRateBps) * BigInt(request.durationDays)) /
        (BigInt(365) * BigInt(10000));
      const totalDue = BigInt(amount) + interest;

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + request.durationDays);

      // Store in database
      await this.prisma.loan.create({
        data: {
          loanId: BigInt(loanId.toString()),
          arbanId: BigInt(request.arbanId),
          creditType: 'FAMILY',
          principal: amount.toString(),
          interest: interest.toString(),
          dueDate,
          txHashBorrow: receipt.hash,
          isActive: true,
        },
      });

      // Update credit line
      await this.prisma.creditLine.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: {
          borrowed: { increment: amount.toString() },
          totalBorrowed: { increment: amount.toString() },
        },
      });

      this.logger.log(`Loan taken successfully. Loan ID: ${loanId}`);

      return {
        loanId: Number(loanId),
        principal: ethers.formatUnits(amount, 6),
        interest: ethers.formatUnits(interest, 6),
        totalDue: ethers.formatUnits(totalDue, 6),
        dueDate,
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to borrow: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Repay Family loan
   */
  async repayFamily(request: RepayLoanRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Repaying Family loan ${request.loanIdx} for arban ${request.arbanId}`);

    try {
      // Find loan
      const loans = await this.prisma.loan.findMany({
        where: {
          arbanId: BigInt(request.arbanId),
          creditType: 'FAMILY',
          isActive: true,
        },
        orderBy: { borrowedAt: 'asc' },
      });

      if (request.loanIdx >= loans.length) {
        throw new NotFoundException('Loan not found');
      }

      const loan = loans[request.loanIdx];

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.repayFamily(request.arbanId, request.loanIdx);
      const receipt = await tx.wait();

      // Check if on time
      const now = new Date();
      const onTime = now <= loan.dueDate;

      // Update loan
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: {
          repaidAt: now,
          isActive: false,
          isDefaulted: !onTime,
          txHashRepay: receipt.hash,
        },
      });

      // Update credit line
      const principal = BigInt(loan.principal.toString());
      await this.prisma.creditLine.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: {
          borrowed: { decrement: principal.toString() },
          totalRepaid: { increment: principal.toString() },
          onTimeCount: onTime ? { increment: 1 } : undefined,
          defaultCount: !onTime ? { increment: 1 } : undefined,
        },
      });

      this.logger.log(`Loan repaid successfully. On time: ${onTime}`);
    } catch (error) {
      this.logger.error(`Failed to repay loan: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== ORG CREDIT ====================

  /**
   * Open Org credit line
   */
  async openOrgCreditLine(arbanId: number, signerWallet: ethers.Wallet): Promise<CreditLine> {
    this.logger.log(`Opening Org credit line for arban ${arbanId}`);

    try {
      // Check if already exists
      const existing = await this.prisma.creditLine.findUnique({
        where: { arbanId: BigInt(arbanId) },
      });

      if (existing) {
        throw new BadRequestException('Credit line already exists for this arban');
      }

      // Verify Org Arban exists and has 10+ members
      const orgArban = await this.prisma.organizationalArban.findUnique({
        where: { arbanId: BigInt(arbanId) },
        include: { members: true },
      });

      if (!orgArban || !orgArban.isActive) {
        throw new BadRequestException('Organizational Arban not found or inactive');
      }

      if (orgArban.members.length < 10) {
        throw new BadRequestException('Organizational Arban must have at least 10 members');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.openOrgCreditLine(arbanId);
      await tx.wait();

      // Get credit line details
      const onchainCreditLine = await this.contract.getOrgCreditLine(arbanId);
      const [rating, limit, borrowed, available, isActive] = onchainCreditLine;

      // Store in database
      const creditLine = await this.prisma.creditLine.create({
        data: {
          arbanId: BigInt(arbanId),
          creditType: 'ORG',
          creditRating: Number(rating),
          creditLimit: limit.toString(),
          borrowed: borrowed.toString(),
          isActive,
        },
      });

      this.logger.log(`Org credit line opened successfully`);

      return this.mapCreditLine(creditLine);
    } catch (error) {
      this.logger.error(`Failed to open Org credit line: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Borrow from Org credit line
   */
  async borrowOrg(request: BorrowRequest, signerWallet: ethers.Wallet): Promise<BorrowResponse> {
    this.logger.log(
      `Borrowing ${request.amount} for Org arban ${request.arbanId}, ${request.durationDays} days`,
    );

    try {
      const creditLine = await this.prisma.creditLine.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
      });

      if (!creditLine || creditLine.creditType !== 'ORG') {
        throw new NotFoundException('Org credit line not found');
      }

      const contractWithSigner = this.contract.connect(signerWallet);
      const amount = ethers.parseUnits(request.amount, 6);
      const tx = await contractWithSigner.borrowOrg(request.arbanId, amount, request.durationDays);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'LoanTaken';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('LoanTaken event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const loanId = parsedEvent?.args.loanId;

      const interestRateBps = await this.contract.interestRateBps();
      const interest =
        (BigInt(amount) * BigInt(interestRateBps) * BigInt(request.durationDays)) /
        (BigInt(365) * BigInt(10000));
      const totalDue = BigInt(amount) + interest;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + request.durationDays);

      await this.prisma.loan.create({
        data: {
          loanId: BigInt(loanId.toString()),
          arbanId: BigInt(request.arbanId),
          creditType: 'ORG',
          principal: amount.toString(),
          interest: interest.toString(),
          dueDate,
          txHashBorrow: receipt.hash,
          isActive: true,
        },
      });

      await this.prisma.creditLine.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: {
          borrowed: { increment: amount.toString() },
          totalBorrowed: { increment: amount.toString() },
        },
      });

      this.logger.log(`Org loan taken successfully. Loan ID: ${loanId}`);

      return {
        loanId: Number(loanId),
        principal: ethers.formatUnits(amount, 6),
        interest: ethers.formatUnits(interest, 6),
        totalDue: ethers.formatUnits(totalDue, 6),
        dueDate,
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to borrow: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Repay Org loan
   */
  async repayOrg(request: RepayLoanRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Repaying Org loan ${request.loanIdx} for arban ${request.arbanId}`);

    try {
      const loans = await this.prisma.loan.findMany({
        where: {
          arbanId: BigInt(request.arbanId),
          creditType: 'ORG',
          isActive: true,
        },
        orderBy: { borrowedAt: 'asc' },
      });

      if (request.loanIdx >= loans.length) {
        throw new NotFoundException('Loan not found');
      }

      const loan = loans[request.loanIdx];

      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.repayOrg(request.arbanId, request.loanIdx);
      const receipt = await tx.wait();

      const now = new Date();
      const onTime = now <= loan.dueDate;

      await this.prisma.loan.update({
        where: { id: loan.id },
        data: {
          repaidAt: now,
          isActive: false,
          isDefaulted: !onTime,
          txHashRepay: receipt.hash,
        },
      });

      const principal = BigInt(loan.principal.toString());
      await this.prisma.creditLine.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: {
          borrowed: { decrement: principal.toString() },
          totalRepaid: { increment: principal.toString() },
          onTimeCount: onTime ? { increment: 1 } : undefined,
          defaultCount: !onTime ? { increment: 1 } : undefined,
        },
      });

      this.logger.log(`Org loan repaid successfully. On time: ${onTime}`);
    } catch (error) {
      this.logger.error(`Failed to repay loan: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== VIEW FUNCTIONS ====================

  /**
   * Get credit line
   */
  async getCreditLine(arbanId: number, type: 'FAMILY' | 'ORG'): Promise<CreditLine> {
    const creditLine = await this.prisma.creditLine.findUnique({
      where: { arbanId: BigInt(arbanId) },
    });

    if (!creditLine || creditLine.creditType !== type) {
      throw new NotFoundException(`${type} credit line not found for arban ${arbanId}`);
    }

    return this.mapCreditLine(creditLine);
  }

  /**
   * Get loans
   */
  async getLoans(arbanId: number, type: 'FAMILY' | 'ORG'): Promise<Loan[]> {
    const loans = await this.prisma.loan.findMany({
      where: {
        arbanId: BigInt(arbanId),
        creditType: type,
      },
      orderBy: { borrowedAt: 'desc' },
    });

    return loans.map((loan) => this.mapLoan(loan));
  }

  /**
   * Get credit dashboard
   */
  async getCreditDashboard(arbanId: number, type: 'FAMILY' | 'ORG'): Promise<CreditDashboard> {
    const creditLine = await this.getCreditLine(arbanId, type);
    const allLoans = await this.getLoans(arbanId, type);

    const activeLoans = allLoans.filter((l) => l.isActive);
    const completedLoans = allLoans.filter((l) => !l.isActive);

    // Calculate performance
    const totalLoans = completedLoans.length;
    const onTimeLoans = completedLoans.filter((l) => !l.isDefaulted).length;
    const onTimeRate = totalLoans > 0 ? (onTimeLoans / totalLoans) * 100 : 0;
    const defaultRate = totalLoans > 0 ? ((totalLoans - onTimeLoans) / totalLoans) * 100 : 0;

    // Calculate avg repayment days
    let totalDays = 0;
    completedLoans.forEach((loan) => {
      if (loan.repaidAt) {
        const days = Math.floor(
          (loan.repaidAt.getTime() - loan.borrowedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalDays += days;
      }
    });
    const avgRepaymentDays = totalLoans > 0 ? totalDays / totalLoans : 0;

    return {
      creditLine,
      activeLoans,
      loanHistory: completedLoans,
      performance: {
        onTimeRate,
        defaultRate,
        avgRepaymentDays,
      },
    };
  }

  /**
   * Set interest rate (Admin only)
   */
  async setInterestRate(rateBps: number, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Setting interest rate to ${rateBps} bps`);

    try {
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setInterestRate(rateBps);
      await tx.wait();

      this.logger.log(`Interest rate updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to set interest rate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current interest rate
   */
  async getCurrentInterestRate(): Promise<number> {
    const rateBps = await this.contract.interestRateBps();
    return Number(rateBps);
  }

  // ==================== HELPERS ====================

  private mapCreditLine(cl: any): CreditLine {
    const borrowed = BigInt(cl.borrowed.toString());
    const limit = BigInt(cl.creditLimit.toString());
    const available = limit - borrowed;

    return {
      arbanId: Number(cl.arbanId),
      creditType: cl.creditType === 'FAMILY' ? CreditType.FAMILY : CreditType.ORG,
      creditRating: cl.creditRating,
      creditLimit: cl.creditLimit.toString(),
      borrowed: cl.borrowed.toString(),
      available: available.toString(),
      totalBorrowed: cl.totalBorrowed.toString(),
      totalRepaid: cl.totalRepaid.toString(),
      defaultCount: cl.defaultCount,
      onTimeCount: cl.onTimeCount,
      isActive: cl.isActive,
      openedAt: cl.openedAt,
    };
  }

  private mapLoan(loan: any): Loan {
    const principal = BigInt(loan.principal.toString());
    const interest = BigInt(loan.interest.toString());
    const totalDue = principal + interest;
    
    return {
      loanId: Number(loan.loanId),
      arbanId: Number(loan.arbanId),
      creditType: loan.creditType === 'FAMILY' ? CreditType.FAMILY : CreditType.ORG,
      principal: loan.principal.toString(),
      interest: loan.interest.toString(),
      totalDue: totalDue.toString(),
      dueDate: loan.dueDate,
      borrowedAt: loan.borrowedAt,
      repaidAt: loan.repaidAt,
      isActive: loan.isActive,
      isDefaulted: loan.isDefaulted,
    };
  }
}

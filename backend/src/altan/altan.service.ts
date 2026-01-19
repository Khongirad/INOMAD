import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeatBindingService } from '../seat-binding/seat-binding.service';

@Injectable()
export class AltanService {
  constructor(
    private prisma: PrismaService,
    private seatBindingService: SeatBindingService,
  ) {}

  async getBalance(userId: string) {
    const ledger = await this.prisma.altanLedger.findUnique({
      where: { userId },
    });
    return ledger ? Number(ledger.balance) : 0;
  }

  async getHistory(userId: string) {
    return this.prisma.altanTransaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { seatId: true, role: true } },
        toUser: { select: { seatId: true, role: true } },
      },
      take: 50,
    });
  }

  async transfer(fromUserId: string, recipientIdentifier: string, amount: number) {
    if (amount <= 0) {
        throw new BadRequestException('Amount must be positive');
    }

    // 1. Resolve Recipient
    let toUserId = await this.resolveRecipient(recipientIdentifier);

    if (toUserId === fromUserId) {
        throw new BadRequestException('Cannot transfer to self');
    }

    // 2. Perform Transaction
    // Use interactive transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Check Balance
      const senderLedger = await tx.altanLedger.findUnique({
        where: { userId: fromUserId },
      });

      if (!senderLedger || Number(senderLedger.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Decrement Sender
      await tx.altanLedger.update({
        where: { userId: fromUserId },
        data: {
          balance: { decrement: amount },
        },
      });

      // Increment Recipient (create ledger if not exists)
      const recipientLedger = await tx.altanLedger.findUnique({ where: { userId: toUserId } });
      
      if (recipientLedger) {
        await tx.altanLedger.update({
            where: { userId: toUserId },
            data: { balance: { increment: amount } },
        });
      } else {
        await tx.altanLedger.create({
            data: {
                userId: toUserId,
                balance: amount,
            }
        });
      }

      // Record Transaction
      const transaction = await tx.altanTransaction.create({
        data: {
          fromUserId,
          toUserId,
          amount,
          type: 'TRANSFER',
          status: 'COMPLETED',
        },
      });

      return transaction;
    });
  }

  async resolveUser(identifier: string) {
    // Try Seat ID first
    let user = await this.prisma.user.findFirst({
        where: { seatId: identifier },
        include: { organization: true },
    });

    if (!user) {
        // Try Wallet (mock check via seat binding service if we had reverse lookup)
        // For now, strict Seat ID
        throw new NotFoundException(`User with Seat ID ${identifier} not found`);
    }

    return {
        userId: user.id,
        seatId: user.seatId,
        role: user.role,
        organization: user.organization?.name,
    };
  }

  // Helper to find User ID from "Seat ID" or "Wallet Address"
  private async resolveRecipient(identifier: string): Promise<string> {
    // Try to find by Seat ID first
    // Note: Database stores `seatId`.
    const user = await this.prisma.user.findFirst({
        where: { seatId: identifier },
    });
    
    if (user) return user.id;

    // TODO: Verify if it's a valid wallet address and check blockchain binding
    throw new NotFoundException(`Recipient with Seat ID ${identifier} not found`);
  }
}

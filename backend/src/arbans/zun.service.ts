import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';
import { ethers } from 'ethers';
import { ArbanCompletion_ABI } from '../blockchain/abis/arbanCompletion.abi';
import { ArbanCompletion__factory } from '../typechain-types/factories/ArbanCompletion__factory';
import { Zun, ZunInfo, ClanTree, FormZunRequest, FormZunResponse } from './types/arban.types';

@Injectable()
export class ZunService {
  private readonly logger = new Logger(ZunService.name);
  private contract: ReturnType<typeof ArbanCompletion__factory.connect>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAllocation: CitizenAllocationService,
  ) {
    const contractAddress = process.env.ARBAN_COMPLETION_ADDRESS || '';
    
    if (contractAddress && contractAddress !== '') {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
      this.contract = ArbanCompletion__factory.connect(contractAddress, provider);
      this.logger.log(`✅ ZunService connected to contract at ${contractAddress}`);
    } else {
      this.logger.warn('⚠️  ARBAN_COMPLETION_ADDRESS not configured - Zun blockchain features disabled');
      // @ts-ignore - contract will be undefined, methods will throw appropriate errors
      this.contract = null;
    }
  }

  /**
   * Form Zun (Clan) from sibling Family Arbans
   */
  async formZun(request: FormZunRequest, signerWallet: ethers.Wallet): Promise<FormZunResponse> {
    this.logger.log(`Forming Zun: ${request.zunName} with ${request.arbanIds.length} arbans`);

    try {
      if (request.arbanIds.length < 2) {
        throw new BadRequestException('At least 2 Family Arbans required to form a Zun');
      }

      // Verify all arbans exist and are active
      for (const arbanId of request.arbanIds) {
        const arban = await this.prisma.familyArban.findUnique({
          where: { arbanId: BigInt(arbanId) },
        });

        if (!arban || !arban.isActive) {
          throw new BadRequestException(`Family Arban ${arbanId} not found or inactive`);
        }

        if (arban.zunId) {
          throw new BadRequestException(`Family Arban ${arbanId} already in a Zun`);
        }
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.formZun(request.zunName, request.arbanIds);
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'ZunFormed';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('ZunFormed event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const zunId = parsedEvent?.args.zunId;

      // Store in database
      const zun = await this.prisma.zun.create({
        data: {
          zunId: BigInt(zunId.toString()),
          name: request.zunName,
          founderArbanId: BigInt(request.arbanIds[0]),
          isActive: true,
        },
      });

      // Update family arbans
      await this.prisma.familyArban.updateMany({
        where: {
          arbanId: { in: request.arbanIds.map((id) => BigInt(id)) },
        },
        data: {
          zunId: BigInt(zunId.toString()),
        },
      });

      this.logger.log(`Zun formed successfully. Zun ID: ${zunId}`);

      // Trigger Level 3 allocation for all Arban members
      await this.allocateLevel3ToAllMembers(zun.id);

      return {
        zunId: Number(zunId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to form Zun: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set Zun elder
   */
  async setZunElder(zunId: number, elderSeatId: string, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Setting elder for Zun ${zunId}: seat ${elderSeatId}`);

    try {
      const zun = await this.prisma.zun.findUnique({
        where: { zunId: BigInt(zunId) },
      });

      if (!zun || !zun.isActive) {
        throw new NotFoundException(`Zun ${zunId} not found or inactive`);
      }

      // Call smart contract (eldeSeatId as uint256)
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setZunElder(zunId, BigInt(elderSeatId));
      await tx.wait();

      // Update database
      await this.prisma.zun.update({
        where: { zunId: BigInt(zunId) },
        data: { elderSeatId: elderSeatId },
      });

      this.logger.log(`Zun elder set successfully`);
    } catch (error) {
      this.logger.error(`Failed to set Zun elder: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get Zun by ID
   */
  async getZun(zunId: number): Promise<Zun> {
    const zun = await this.prisma.zun.findUnique({
      where: { zunId: BigInt(zunId) },
      include: {
        memberArbans: true,
      },
    });

    if (!zun) {
      throw new NotFoundException(`Zun ${zunId} not found`);
    }

    return {
      zunId: Number(zun.zunId),
      name: zun.name,
      founderArbanId: Number(zun.founderArbanId),
      memberArbanIds: zun.memberArbans.map((a) => Number(a.arbanId)),
      elderSeatId: zun.elderSeatId ? zun.elderSeatId || "" : "",
      isActive: zun.isActive,
      createdAt: zun.createdAt,
    };
  }

  /**
   * Get Zuns by Family Arban
   */
  async getZunsByFamily(arbanId: number): Promise<Zun[]> {
    const arban = await this.prisma.familyArban.findUnique({
      where: { arbanId: BigInt(arbanId) },
      include: {
        zun: {
          include: {
            memberArbans: true,
          },
        },
      },
    });

    if (!arban || !arban.zun) {
      return [];
    }

    return [
      {
        zunId: Number(arban.zun.zunId),
        name: arban.zun.name,
        founderArbanId: Number(arban.zun.founderArbanId),
        memberArbanIds: arban.zun.memberArbans.map((a) => Number(a.arbanId)),
        elderSeatId: arban.zun.elderSeatId ? arban.zun.elderSeatId || "" : "",
        isActive: arban.zun.isActive,
        createdAt: arban.zun.createdAt,
      },
    ];
  }

  /**
   * Sync Zun from blockchain
   */
  async syncFromBlockchain(zunId: number): Promise<void> {
    this.logger.log(`Syncing Zun ${zunId} from blockchain`);

    try {
      const onchainZun = await this.contract.getZun(zunId);
      const [name, founderArbanId, memberArbanIds, elderSeatId, isActive] = onchainZun;

      // Upsert zun
      await this.prisma.zun.upsert({
        where: { zunId: BigInt(zunId) },
        create: {
          zunId: BigInt(zunId),
          name,
          founderArbanId: BigInt(founderArbanId.toString()),
          elderSeatId: elderSeatId ? String(elderSeatId) : null,
          isActive,
        },
        update: {
          name,
          founderArbanId: BigInt(founderArbanId.toString()),
          elderSeatId: elderSeatId ? String(elderSeatId) : null,
          isActive,
        },
      });

      // Update member arbans
      await this.prisma.familyArban.updateMany({
        where: {
          arbanId: { in: memberArbanIds.map((id: any) => BigInt(id.toString())) },
        },
        data: {
          zunId: BigInt(zunId),
        },
      });

      this.logger.log(`Sync completed for Zun ${zunId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Zun: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Allocate Level 3 funds to all members of the Zun
   * Called automatically after Zun formation
   */
  private async allocateLevel3ToAllMembers(zunId: string): Promise<void> {
    this.logger.log(`Starting Level 3 allocation for all members of Zun ${zunId}`);

    try {
      // Get all member Arbans with their members
      const zun = await this.prisma.zun.findUnique({
        where: { id: zunId },
        include: {
          memberArbans: {
            include: { children: true },
          },
        },
      });

      if (!zun || !zun.memberArbans) {
        this.logger.warn(`Zun ${zunId} has no member Arbans`);
        return;
      }

      const allSeatIds = new Set<string>();

      // Collect all unique seatIds from member Arbans
      for (const arban of zun.memberArbans) {
        allSeatIds.add(arban.husbandSeatId);
        allSeatIds.add(arban.wifeSeatId);
        arban.children.forEach((child) => allSeatIds.add(child.childSeatId));
      }

      // Resolve seatIds to userIds
      const users = await this.prisma.user.findMany({
        where: { seatId: { in: Array.from(allSeatIds) } },
        select: { id: true, seatId: true },
      });

      this.logger.log(
        `Found ${users.length} users to allocate Level 3 funds. Zun has ${zun.memberArbans.length} Arbans.`,
      );

      // Allocate to each user
      for (const user of users) {
        try {
          const result = await this.citizenAllocation.allocateLevel3Funds(
            user.id,
            zunId,
          );

          if (result.allocated) {
            this.logger.log(
              `✅ Allocated ${result.amount} ALTAN to ${user.seatId} for Zun formation`,
            );
          } else {
            this.logger.log(
              `ℹ️  User ${user.seatId} already received Level 3 allocation`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to allocate Level 3 funds to user ${user.seatId}:`,
            error,
          );
          // Continue with other users even if one fails
        }
      }

      this.logger.log(
        `Completed Level 3 allocation for Zun ${zunId}. Processed ${users.length} users.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to allocate Level 3 funds for Zun ${zunId}:`,
        error,
      );
      // Don't throw - Zun formation should still succeed even if allocation fails
    }
  }
}

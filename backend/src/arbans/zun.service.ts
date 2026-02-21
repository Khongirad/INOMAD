import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';
import { ethers } from 'ethers';
import { ArbadCompletion_ABI } from '../blockchain/abis/arbadCompletion.abi';
import { ArbadCompletion__factory } from '../typechain-types/factories/ArbadCompletion__factory';
import { Zun, ZunInfo, ClanTree, FormZunRequest, FormZunResponse } from './types/arbad.types';

@Injectable()
export class ZunService {
  private readonly logger = new Logger(ZunService.name);
  private contract: ReturnType<typeof ArbadCompletion__factory.connect>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAllocation: CitizenAllocationService,
  ) {
    const contractAddress = process.env.ARBAD_COMPLETION_ADDRESS || '';
    
    if (contractAddress && contractAddress !== '') {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
      this.contract = ArbadCompletion__factory.connect(contractAddress, provider);
      this.logger.log(`✅ ZunService connected to contract at ${contractAddress}`);
    } else {
      this.logger.warn('⚠️  ARBAD_COMPLETION_ADDRESS not configured - Zun blockchain features disabled');
      // @ts-ignore - contract will be undefined, methods will throw appropriate errors
      this.contract = null;
    }
  }

  /**
   * Form Zun (Clan) from sibling Family Arbads
   */
  async formZun(request: FormZunRequest, signerWallet: ethers.Wallet): Promise<FormZunResponse> {
    this.logger.log(`Forming Zun: ${request.zunName} with ${request.arbadIds.length} arbads`);

    try {
      if (request.arbadIds.length < 2) {
        throw new BadRequestException('At least 2 Family Arbads required to form a Zun');
      }

      // Verify all arbads exist and are active
      for (const arbadId of request.arbadIds) {
        const arbad = await this.prisma.familyArbad.findUnique({
          where: { arbadId: BigInt(arbadId) },
        });

        if (!arbad || !arbad.isActive) {
          throw new BadRequestException(`Family Arbad ${arbadId} not found or inactive`);
        }

        if (arbad.zunId) {
          throw new BadRequestException(`Family Arbad ${arbadId} already in a Zun`);
        }
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.formZun(request.zunName, request.arbadIds);
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
          founderArbadId: BigInt(request.arbadIds[0]),
          isActive: true,
        },
      });

      // Update family arbads
      await this.prisma.familyArbad.updateMany({
        where: {
          arbadId: { in: request.arbadIds.map((id) => BigInt(id)) },
        },
        data: {
          zunId: BigInt(zunId.toString()),
        },
      });

      this.logger.log(`Zun formed successfully. Zun ID: ${zunId}`);

      // Trigger Level 3 allocation for all Arbad members
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
        memberArbads: true,
      },
    });

    if (!zun) {
      throw new NotFoundException(`Zun ${zunId} not found`);
    }

    return {
      zunId: Number(zun.zunId),
      name: zun.name,
      founderArbadId: Number(zun.founderArbadId),
      memberArbadIds: zun.memberArbads.map((a) => Number(a.arbadId)),
      elderSeatId: zun.elderSeatId ? zun.elderSeatId || "" : "",
      isActive: zun.isActive,
      createdAt: zun.createdAt,
    };
  }

  /**
   * Get Zuns by Family Arbad
   */
  async getZunsByFamily(arbadId: number): Promise<Zun[]> {
    const arbad = await this.prisma.familyArbad.findUnique({
      where: { arbadId: BigInt(arbadId) },
      include: {
        zun: {
          include: {
            memberArbads: true,
          },
        },
      },
    });

    if (!arbad || !arbad.zun) {
      return [];
    }

    return [
      {
        zunId: Number(arbad.zun.zunId),
        name: arbad.zun.name,
        founderArbadId: Number(arbad.zun.founderArbadId),
        memberArbadIds: arbad.zun.memberArbads.map((a) => Number(a.arbadId)),
        elderSeatId: arbad.zun.elderSeatId ? arbad.zun.elderSeatId || "" : "",
        isActive: arbad.zun.isActive,
        createdAt: arbad.zun.createdAt,
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
      const [name, founderArbadId, memberArbadIds, elderSeatId, isActive] = onchainZun;

      // Upsert zun
      await this.prisma.zun.upsert({
        where: { zunId: BigInt(zunId) },
        create: {
          zunId: BigInt(zunId),
          name,
          founderArbadId: BigInt(founderArbadId.toString()),
          elderSeatId: elderSeatId ? String(elderSeatId) : null,
          isActive,
        },
        update: {
          name,
          founderArbadId: BigInt(founderArbadId.toString()),
          elderSeatId: elderSeatId ? String(elderSeatId) : null,
          isActive,
        },
      });

      // Update member arbads
      await this.prisma.familyArbad.updateMany({
        where: {
          arbadId: { in: memberArbadIds.map((id: any) => BigInt(id.toString())) },
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
      // Get all member Arbads with their members
      const zun = await this.prisma.zun.findUnique({
        where: { id: zunId },
        include: {
          memberArbads: {
            include: { children: true },
          },
        },
      });

      if (!zun || !zun.memberArbads) {
        this.logger.warn(`Zun ${zunId} has no member Arbads`);
        return;
      }

      const allSeatIds = new Set<string>();

      // Collect all unique seatIds from member Arbads
      for (const arbad of zun.memberArbads) {
        allSeatIds.add(arbad.husbandSeatId);
        allSeatIds.add(arbad.wifeSeatId);
        arbad.children.forEach((child) => allSeatIds.add(child.childSeatId));
      }

      // Resolve seatIds to userIds
      const users = await this.prisma.user.findMany({
        where: { seatId: { in: Array.from(allSeatIds) } },
        select: { id: true, seatId: true },
      });

      this.logger.log(
        `Found ${users.length} users to allocate Level 3 funds. Zun has ${zun.memberArbads.length} Arbads.`,
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

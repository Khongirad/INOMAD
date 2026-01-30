import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { ArbanCompletion_ABI } from '../blockchain/abis/arbanCompletion.abi';
import { Zun, ZunInfo, ClanTree, FormZunRequest, FormZunResponse } from './types/arban.types';

@Injectable()
export class ZunService {
  private readonly logger = new Logger(ZunService.name);
  private contract: ethers.Contract;

  constructor(private readonly prisma: PrismaService) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const contractAddress = process.env.ARBAN_COMPLETION_ADDRESS || '';
    this.contract = new ethers.Contract(contractAddress, ArbanCompletion_ABI, provider);
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
  async setZunElder(zunId: number, elderSeatId: number, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Setting elder for Zun ${zunId}: seat ${elderSeatId}`);

    try {
      const zun = await this.prisma.zun.findUnique({
        where: { zunId: BigInt(zunId) },
      });

      if (!zun || !zun.isActive) {
        throw new NotFoundException(`Zun ${zunId} not found or inactive`);
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setZunElder(zunId, elderSeatId);
      await tx.wait();

      // Update database
      await this.prisma.zun.update({
        where: { zunId: BigInt(zunId) },
        data: { elderSeatId: BigInt(elderSeatId) },
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
      elderSeatId: zun.elderSeatId ? Number(zun.elderSeatId) : 0,
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
        elderSeatId: arban.zun.elderSeatId ? Number(arban.zun.elderSeatId) : 0,
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
          elderSeatId: elderSeatId ? BigInt(elderSeatId.toString()) : null,
          isActive,
        },
        update: {
          name,
          founderArbanId: BigInt(founderArbanId.toString()),
          elderSeatId: elderSeatId ? BigInt(elderSeatId.toString()) : null,
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
}

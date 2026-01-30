import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { ArbanCompletion_ABI } from '../blockchain/abis/arbanCompletion.abi';
import {
  FamilyArban,
  FamilyTree,
  RegisterMarriageRequest,
  RegisterMarriageResponse,
  AddChildRequest,
  ChangeHeirRequest,
  SetKhuralRepRequest,
  KhuralRepresentative,
  CitizenInfo,
} from './types/arban.types';

@Injectable()
export class FamilyArbanService {
  private readonly logger = new Logger(FamilyArbanService.name);
  private contract: ethers.Contract;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    // Initialize contract connection
    // TODO: Get provider and contract address from config
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const contractAddress = process.env.ARBAN_COMPLETION_ADDRESS || '';
    this.contract = new ethers.Contract(contractAddress, ArbanCompletion_ABI, provider);
  }

  /**
   * Register marriage and create Family Arban
   */
  async registerMarriage(
    request: RegisterMarriageRequest,
    signerWallet: ethers.Wallet,
  ): Promise<RegisterMarriageResponse> {
    this.logger.log(`Registering marriage: ${request.husbandSeatId} + ${request.wifeSeatId}`);

    try {
      // Check if either party is already married
      const existingHusbandArban = await this.prisma.familyArban.findFirst({
        where: {
          OR: [
            { husbandSeatId: BigInt(request.husbandSeatId) },
            { wifeSeatId: BigInt(request.husbandSeatId) },
          ],
          isActive: true,
        },
      });

      const existingWifeArban = await this.prisma.familyArban.findFirst({
        where: {
          OR: [
            { husbandSeatId: BigInt(request.wifeSeatId) },
            { wifeSeatId: BigInt(request.wifeSeatId) },
          ],
          isActive: true,
        },
      });

      if (existingHusbandArban || existingWifeArban) {
        throw new BadRequestException('One or both parties are already married');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.registerMarriage(
        request.husbandSeatId,
        request.wifeSeatId,
      );
      const receipt = await tx.wait();

      // Parse event to get arbanId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'MarriageRegistered';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('MarriageRegistered event not found in transaction');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const arbanId = parsedEvent?.args.arbanId;

      // Store in database
      await this.prisma.familyArban.create({
        data: {
          arbanId: BigInt(arbanId.toString()),
          husbandSeatId: BigInt(request.husbandSeatId),
          wifeSeatId: BigInt(request.wifeSeatId),
          isActive: true,
        },
      });

      this.logger.log(`Marriage registered successfully. Arban ID: ${arbanId}`);

      return {
        arbanId: Number(arbanId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to register marriage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add child to Family Arban
   */
  async addChild(request: AddChildRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Adding child ${request.childSeatId} to arban ${request.arbanId}`);

    try {
      // Verify arban exists
      const arban = await this.prisma.familyArban.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
      });

      if (!arban) {
        throw new NotFoundException(`Family Arban ${request.arbanId} not found`);
      }

      if (!arban.isActive) {
        throw new BadRequestException('Family Arban is not active');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.addChild(request.arbanId, request.childSeatId);
      await tx.wait();

      // Store in database
      await this.prisma.familyArbanChild.create({
        data: {
          arbanId: BigInt(request.arbanId),
          childSeatId: BigInt(request.childSeatId),
        },
      });

      // Update heir (youngest child)
      await this.prisma.familyArban.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: { heirSeatId: BigInt(request.childSeatId) },
      });

      this.logger.log(`Child added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add child: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Change heir to another child
   */
  async changeHeir(request: ChangeHeirRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Changing heir for arban ${request.arbanId} to ${request.newHeirSeatId}`);

    try {
      // Verify child exists
      const child = await this.prisma.familyArbanChild.findFirst({
        where: {
          arbanId: BigInt(request.arbanId),
          childSeatId: BigInt(request.newHeirSeatId),
        },
      });

      if (!child) {
        throw new BadRequestException('Specified seat is not a child of this arban');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.changeHeir(request.arbanId, request.newHeirSeatId);
      await tx.wait();

      // Update database
      await this.prisma.familyArban.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: { heirSeatId: BigInt(request.newHeirSeatId) },
      });

      this.logger.log(`Heir changed successfully`);
    } catch (error) {
      this.logger.error(`Failed to change heir: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set Khural representative (husband or wife, under 60 years old)
   */
  async setKhuralRepresentative(
    request: SetKhuralRepRequest,
    signerWallet: ethers.Wallet,
  ): Promise<void> {
    this.logger.log(
      `Setting Khural rep for arban ${request.arbanId}: seat ${request.repSeatId}, born ${request.birthYear}`,
    );

    try {
      // Verify age (must be under 60)
      const currentYear = new Date().getFullYear();
      const age = currentYear - request.birthYear;
      if (age >= 60) {
        throw new BadRequestException('Representative must be under 60 years old');
      }

      // Verify arban exists
      const arban = await this.prisma.familyArban.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
      });

      if (!arban) {
        throw new NotFoundException(`Family Arban ${request.arbanId} not found`);
      }

      // Verify rep is husband or wife
      if (
        BigInt(request.repSeatId) !== arban.husbandSeatId &&
        BigInt(request.repSeatId) !== arban.wifeSeatId
      ) {
        throw new BadRequestException('Khural representative must be husband or wife');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setKhuralRepresentative(
        request.arbanId,
        request.repSeatId,
        request.birthYear,
      );
      await tx.wait();

      // Update database
      await this.prisma.familyArban.update({
        where: { arbanId: BigInt(request.arbanId) },
        data: {
          khuralRepSeatId: BigInt(request.repSeatId),
          khuralRepBirthYear: request.birthYear,
        },
      });

      this.logger.log(`Khural representative set successfully`);
    } catch (error) {
      this.logger.error(`Failed to set Khural rep: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all Khural representatives
   */
  async getKhuralRepresentatives(): Promise<KhuralRepresentative[]> {
    this.logger.log('Fetching all Khural representatives');

    const arbans = await this.prisma.familyArban.findMany({
      where: {
        isActive: true,
        khuralRepSeatId: { not: null },
      },
      select: {
        arbanId: true,
        khuralRepSeatId: true,
        khuralRepBirthYear: true,
        createdAt: true,
      },
    });

    const currentYear = new Date().getFullYear();

    return arbans.map((arban) => ({
      seatId: Number(arban.khuralRepSeatId!),
      arbanId: Number(arban.arbanId),
      birthYear: arban.khuralRepBirthYear!,
      age: currentYear - arban.khuralRepBirthYear!,
      assignedAt: arban.createdAt,
    }));
  }

  /**
   * Get Family Arban by ID
   */
  async getFamilyArban(arbanId: number): Promise<FamilyArban> {
    const arban = await this.prisma.familyArban.findUnique({
      where: { arbanId: BigInt(arbanId) },
      include: {
        children: true,
      },
    });

    if (!arban) {
      throw new NotFoundException(`Family Arban ${arbanId} not found`);
    }

    return {
      arbanId: Number(arban.arbanId),
      husbandSeatId: Number(arban.husbandSeatId),
      wifeSeatId: Number(arban.wifeSeatId),
      childrenSeatIds: arban.children.map((c) => Number(c.childSeatId)),
      heirSeatId: arban.heirSeatId ? Number(arban.heirSeatId) : 0,
      zunId: arban.zunId ? Number(arban.zunId) : 0,
      khuralRepSeatId: arban.khuralRepSeatId ? Number(arban.khuralRepSeatId) : 0,
      khuralRepBirthYear: arban.khuralRepBirthYear || 0,
      isActive: arban.isActive,
      createdAt: arban.createdAt,
    };
  }

  /**
   * Get Family Arban by seat ID (husband, wife, or child)
   */
  async getFamilyArbanBySeat(seatId: number): Promise<FamilyArban | null> {
    const arban = await this.prisma.familyArban.findFirst({
      where: {
        OR: [
          { husbandSeatId: BigInt(seatId) },
          { wifeSeatId: BigInt(seatId) },
          {
            children: {
              some: { childSeatId: BigInt(seatId) },
            },
          },
        ],
        isActive: true,
      },
      include: {
        children: true,
      },
    });

    if (!arban) {
      return null;
    }

    return {
      arbanId: Number(arban.arbanId),
      husbandSeatId: Number(arban.husbandSeatId),
      wifeSeatId: Number(arban.wifeSeatId),
      childrenSeatIds: arban.children.map((c) => Number(c.childSeatId)),
      heirSeatId: arban.heirSeatId ? Number(arban.heirSeatId) : 0,
      zunId: arban.zunId ? Number(arban.zunId) : 0,
      khuralRepSeatId: arban.khuralRepSeatId ? Number(arban.khuralRepSeatId) : 0,
      khuralRepBirthYear: arban.khuralRepBirthYear || 0,
      isActive: arban.isActive,
      createdAt: arban.createdAt,
    };
  }

  /**
   * Check Khural eligibility (married = eligible)
   */
  async checkKhuralEligibility(arbanId: number): Promise<boolean> {
    const arban = await this.prisma.familyArban.findUnique({
      where: { arbanId: BigInt(arbanId) },
    });

    if (!arban) {
      return false;
    }

    // Marriage exists = eligible
    return arban.isActive;
  }

  /**
   * Sync Family Arban from blockchain
   */
  async syncFromBlockchain(arbanId: number): Promise<void> {
    this.logger.log(`Syncing Family Arban ${arbanId} from blockchain`);

    try {
      const onchainArban = await this.contract.getFamilyArban(arbanId);

      const [husbandSeatId, wifeSeatId, childrenSeatIds, heirSeatId, zunId, khuralRepSeatId, isActive] =
        onchainArban;

      // Upsert arban
      await this.prisma.familyArban.upsert({
        where: { arbanId: BigInt(arbanId) },
        create: {
          arbanId: BigInt(arbanId),
          husbandSeatId: BigInt(husbandSeatId.toString()),
          wifeSeatId: BigInt(wifeSeatId.toString()),
          heirSeatId: heirSeatId ? BigInt(heirSeatId.toString()) : null,
          zunId: zunId ? BigInt(zunId.toString()) : null,
          khuralRepSeatId: khuralRepSeatId ? BigInt(khuralRepSeatId.toString()) : null,
          isActive,
        },
        update: {
          husbandSeatId: BigInt(husbandSeatId.toString()),
          wifeSeatId: BigInt(wifeSeatId.toString()),
          heirSeatId: heirSeatId ? BigInt(heirSeatId.toString()) : null,
          zunId: zunId ? BigInt(zunId.toString()) : null,
          khuralRepSeatId: khuralRepSeatId ? BigInt(khuralRepSeatId.toString()) : null,
          isActive,
        },
      });

      // Sync children
      await this.prisma.familyArbanChild.deleteMany({
        where: { arbanId: BigInt(arbanId) },
      });

      for (const childSeatId of childrenSeatIds) {
        await this.prisma.familyArbanChild.create({
          data: {
            arbanId: BigInt(arbanId),
            childSeatId: BigInt(childSeatId.toString()),
          },
        });
      }

      this.logger.log(`Sync completed for Family Arban ${arbanId}`);
    } catch (error) {
      this.logger.error(`Failed to sync arban: ${error.message}`, error.stack);
      throw error;
    }
  }
}

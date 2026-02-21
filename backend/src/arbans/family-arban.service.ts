import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractAddressesService } from '../blockchain/contract-addresses.service';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ArbadCompletion_ABI } from '../blockchain/abis/arbadCompletion.abi';
import { ArbadCompletion__factory } from '../typechain-types/factories/ArbadCompletion__factory';
import {
  FamilyArbad,
  FamilyTree,
  RegisterMarriageRequest,
  RegisterMarriageResponse,
  AddChildRequest,
  ChangeHeirRequest,
  SetKhuralRepRequest,
  KhuralRepresentative,
  CitizenInfo,
} from './types/arbad.types';

@Injectable()
export class FamilyArbadService {
  private readonly logger = new Logger(FamilyArbadService.name);
  private contract: ReturnType<typeof ArbadCompletion__factory.connect>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractAddresses: ContractAddressesService,
    private readonly config: ConfigService,
  ) {
    // Initialize contract connection with centralized configuration
    const rpcUrl = this.config.get<string>('ALTAN_RPC_URL') || this.contractAddresses.getRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get contract address from ContractAddressesService
    const guildContracts = this.contractAddresses.getGuildContracts();
    const contractAddress = guildContracts.arbadCompletion;
    
    this.contract = ArbadCompletion__factory.connect(contractAddress, provider);
    this.logger.log(`✅ ArbadCompletion initialized at ${contractAddress}`);
  }

  /**
   * Register marriage and create Family Arbad
   */
  async registerMarriage(
    request: RegisterMarriageRequest,
    signerWallet: ethers.Wallet,
  ): Promise<RegisterMarriageResponse> {
    this.logger.log(`Registering marriage: ${request.husbandSeatId} + ${request.wifeSeatId}`);

    try {
      // Check if either party is already married
      const existingHusbandArbad = await this.prisma.familyArbad.findFirst({
        where: {
          OR: [
            { husbandSeatId: request.husbandSeatId },
            { wifeSeatId: request.husbandSeatId },
          ],
          isActive: true,
        },
      });

      const existingWifeArbad = await this.prisma.familyArbad.findFirst({
        where: {
          OR: [
            { husbandSeatId: request.wifeSeatId },
            { wifeSeatId: request.wifeSeatId },
          ],
          isActive: true,
        },
      });

      if (existingHusbandArbad || existingWifeArbad) {
        throw new BadRequestException('One or both parties are already married');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.registerMarriage(
        request.husbandSeatId,
        request.wifeSeatId,
      );
      const receipt = await tx.wait();

      // Parse event to get arbadId
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
      const arbadId = parsedEvent?.args.arbadId;

      // Store in database
      await this.prisma.familyArbad.create({
        data: {
          arbadId: arbadId.toString(),
          husbandSeatId: request.husbandSeatId,
          wifeSeatId: request.wifeSeatId,
          isActive: true,
        },
      });

      this.logger.log(`Marriage registered successfully. Arbad ID: ${arbadId}`);

      return {
        arbadId: Number(arbadId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to register marriage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add child to Family Arbad
   */
  async addChild(request: AddChildRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Adding child ${request.childSeatId} to arbad ${request.arbadId}`);

    try {
      // Verify arbad exists
      const arbad = await this.prisma.familyArbad.findUnique({
        where: { arbadId: request.arbadId },
      });

      if (!arbad) {
        throw new NotFoundException(`Family Arbad ${request.arbadId} not found`);
      }

      if (!arbad.isActive) {
        throw new BadRequestException('Family Arbad is not active');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.addChild(request.arbadId, request.childSeatId);
      await tx.wait();

      // Store in database
      await this.prisma.familyArbadChild.create({
        data: {
          arbadId: request.arbadId,
          childSeatId: request.childSeatId,
        },
      });

      // Update heir (youngest child)
      await this.prisma.familyArbad.update({
        where: { arbadId: request.arbadId },
        data: { heirSeatId: request.childSeatId },
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
    this.logger.log(`Changing heir for arbad ${request.arbadId} to ${request.newHeirSeatId}`);

    try {
      // Verify child exists
      const child = await this.prisma.familyArbadChild.findFirst({
        where: {
          arbadId: request.arbadId,
          childSeatId: request.newHeirSeatId,
        },
      });

      if (!child) {
        throw new BadRequestException('Specified seat is not a child of this arbad');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.changeHeir(request.arbadId, request.newHeirSeatId);
      await tx.wait();

      // Update database
      await this.prisma.familyArbad.update({
        where: { arbadId: request.arbadId },
        data: { heirSeatId: request.newHeirSeatId },
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
      `Setting Khural rep for arbad ${request.arbadId}: seat ${request.repSeatId}, born ${request.birthYear}`,
    );

    try {
      // Verify age (must be under 60)
      const currentYear = new Date().getFullYear();
      const age = currentYear - request.birthYear;
      if (age >= 60) {
        throw new BadRequestException('Representative must be under 60 years old');
      }

      // Verify arbad exists
      const arbad = await this.prisma.familyArbad.findUnique({
        where: { arbadId: request.arbadId },
      });

      if (!arbad) {
        throw new NotFoundException(`Family Arbad ${request.arbadId} not found`);
      }

      // Verify rep is husband or wife
      if (
        request.repSeatId !== arbad.husbandSeatId &&
        request.repSeatId !== arbad.wifeSeatId
      ) {
        throw new BadRequestException('Khural representative must be husband or wife');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setKhuralRepresentative(
        request.arbadId,
        request.repSeatId,
        request.birthYear,
      );
      await tx.wait();

      // Update database
      await this.prisma.familyArbad.update({
        where: { arbadId: request.arbadId },
        data: {
          khuralRepSeatId: request.repSeatId,
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

    const arbads = await this.prisma.familyArbad.findMany({
      where: {
        isActive: true,
        khuralRepSeatId: { not: null },
      },
      select: {
        arbadId: true,
        khuralRepSeatId: true,
        khuralRepBirthYear: true,
        createdAt: true,
      },
    });

    const currentYear = new Date().getFullYear();

    return arbads.map((arbad) => ({
      seatId: arbad.khuralRepSeatId!,
      arbadId: Number(arbad.arbadId),
      birthYear: arbad.khuralRepBirthYear!,
      age: currentYear - arbad.khuralRepBirthYear!,
      assignedAt: arbad.createdAt,
    }));
  }

  /**
   * Get Family Arbad by ID
   */
  async getFamilyArbad(arbadId: number): Promise<FamilyArbad> {
    const arbad = await this.prisma.familyArbad.findUnique({
      where: { arbadId: arbadId },
      include: {
        children: true,
      },
    });

    if (!arbad) {
      throw new NotFoundException(`Family Arbad ${arbadId} not found`);
    }

    return {
      arbadId: Number(arbad.arbadId),
      husbandSeatId: arbad.husbandSeatId,
      wifeSeatId: arbad.wifeSeatId,
      childrenSeatIds: arbad.children.map((c) => c.childSeatId),
      heirSeatId: arbad.heirSeatId || "",
      zunId: arbad.zunId ? Number(arbad.zunId) : 0,
      khuralRepSeatId: arbad.khuralRepSeatId || "",
      khuralRepBirthYear: arbad.khuralRepBirthYear || 0,
      isActive: arbad.isActive,
      createdAt: arbad.createdAt,
    };
  }

  /**
   * Get Family Arbad by seat ID (husband, wife, or child)
   */
  async getFamilyArbadBySeat(seatId: string): Promise<FamilyArbad | null> {
    const arbad = await this.prisma.familyArbad.findFirst({
      where: {
        OR: [
          { husbandSeatId: seatId },
          { wifeSeatId: seatId },
          {
            children: {
              some: { childSeatId: seatId },
            },
          },
        ],
        isActive: true,
      },
      include: {
        children: true,
      },
    });

    if (!arbad) {
      return null;
    }

    return {
      arbadId: Number(arbad.arbadId),
      husbandSeatId: arbad.husbandSeatId,
      wifeSeatId: arbad.wifeSeatId,
      childrenSeatIds: arbad.children.map((c) => c.childSeatId),
      heirSeatId: arbad.heirSeatId || "",
      zunId: arbad.zunId ? Number(arbad.zunId) : 0,
      khuralRepSeatId: arbad.khuralRepSeatId || "",
      khuralRepBirthYear: arbad.khuralRepBirthYear || 0,
      isActive: arbad.isActive,
      createdAt: arbad.createdAt,
    };
  }

  /**
   * Check Khural eligibility (married = eligible)
   */
  async checkKhuralEligibility(arbadId: number): Promise<boolean> {
    const arbad = await this.prisma.familyArbad.findUnique({
      where: { arbadId: arbadId },
    });

    if (!arbad) {
      return false;
    }

    // Marriage exists = eligible
    return arbad.isActive;
  }

  /**
   * Sync Family Arbad from blockchain
   */
  async syncFromBlockchain(arbadId: number): Promise<void> {
    this.logger.log(`Syncing Family Arbad ${arbadId} from blockchain`);

    try {
      const onchainArbad = await this.contract.getFamilyArbad(arbadId);

      const [husbandSeatId, wifeSeatId, childrenSeatIds, heirSeatId, zunId, khuralRepSeatId, isActive] =
        onchainArbad;

      // Upsert arbad
      await this.prisma.familyArbad.upsert({
        where: { arbadId: arbadId },
        create: {
          arbadId: arbadId,
          husbandSeatId: husbandSeatId.toString(),
          wifeSeatId: wifeSeatId.toString(),
          heirSeatId: heirSeatId ? heirSeatId.toString() : null,
          zunId: zunId,
          khuralRepSeatId: khuralRepSeatId ? khuralRepSeatId.toString() : null,
          isActive,
        },
        update: {
          husbandSeatId: husbandSeatId.toString(),
          wifeSeatId: wifeSeatId.toString(),
          heirSeatId: heirSeatId ? heirSeatId.toString() : null,
          zunId: zunId,
          khuralRepSeatId: khuralRepSeatId ? khuralRepSeatId.toString() : null,
          isActive,
        },
      });

      // Sync children
      await this.prisma.familyArbadChild.deleteMany({
        where: { arbadId: arbadId },
      });

      for (const childSeatId of childrenSeatIds) {
        await this.prisma.familyArbadChild.create({
          data: {
            arbadId: arbadId,
            childSeatId: childSeatId.toString(),
          },
        });
      }

      this.logger.log(`Sync completed for Family Arbad ${arbadId}`);
    } catch (error) {
      this.logger.error(`Failed to sync arbad: ${error.message}`, error.stack);
      throw error;
    }
  }
}

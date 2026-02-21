import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';
import { ethers } from 'ethers';
import { ArbadCompletion_ABI, OrganizationType } from '../blockchain/abis/arbadCompletion.abi';
import { ArbadCompletion__factory } from '../typechain-types/factories/ArbadCompletion__factory';
import {
  OrganizationalArbad,
  OrgChart,
  CreateOrgArbadRequest,
  CreateOrgArbadResponse,
  AddOrgMemberRequest,
  SetOrgLeaderRequest,
  CreateDepartmentRequest,
} from './types/arbad.types';

@Injectable()
export class OrganizationalArbadService {
  private readonly logger = new Logger(OrganizationalArbadService.name);
  private contract: ReturnType<typeof ArbadCompletion__factory.connect>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAllocation: CitizenAllocationService,
  ) {
    const contractAddress = process.env.ARBAD_COMPLETION_ADDRESS || '';
    
    if (contractAddress && contractAddress !== '') {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
      this.contract = ArbadCompletion__factory.connect(contractAddress, provider);
      this.logger.log(`✅ OrganizationalArbadService connected`);
    } else {
      this.logger.warn('⚠️  ARBAD_COMPLETION_ADDRESS not configured - Org Arbad features disabled');
      // @ts-ignore
      this.contract = null;
    }
  }

  /**
   * Create Organizational Arbad
   */
  async createOrganizationalArbad(
    request: CreateOrgArbadRequest,
    signerWallet: ethers.Wallet,
  ): Promise<CreateOrgArbadResponse> {
    this.logger.log(`Creating Organizational Arbad: ${request.name} (${request.orgType})`);

    try {
      // Convert string orgType to enum if needed
      let orgTypeValue: OrganizationType;
      if (typeof request.orgType === 'string') {
        const typeMap: Record<string, OrganizationType> = {
          NONE: OrganizationType.NONE,
          EXECUTIVE: OrganizationType.EXECUTIVE,
          JUDICIAL: OrganizationType.JUDICIAL,
          BANKING: OrganizationType.BANKING,
          PRIVATE_COMPANY: OrganizationType.PRIVATE_COMPANY,
          STATE_COMPANY: OrganizationType.STATE_COMPANY,
          GUILD: OrganizationType.GUILD,
          SCIENTIFIC_COUNCIL: OrganizationType.SCIENTIFIC_COUNCIL,
          EKHE_KHURAL: OrganizationType.EKHE_KHURAL,
        };
        orgTypeValue = typeMap[request.orgType] ?? OrganizationType.NONE;
      } else {
        orgTypeValue = request.orgType;
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.createOrganizationalArbad(request.name, orgTypeValue);
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'OrgArbadCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('OrgArbadCreated event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const arbadId = parsedEvent?.args.arbadId;
      const powerBranch = parsedEvent?.args.branch;

      // Map enum values
      const orgTypeMap: Record<number, string> = {
        0: 'NONE',
        1: 'EXECUTIVE',
        2: 'JUDICIAL',
        3: 'BANKING',
        4: 'PRIVATE_COMPANY',
        5: 'STATE_COMPANY',
        6: 'GUILD',
        7: 'SCIENTIFIC_COUNCIL',
        8: 'EKHE_KHURAL',
      };

      const powerBranchMap: Record<number, string> = {
        0: 'NONE',
        1: 'LEGISLATIVE',
        2: 'EXECUTIVE',
        3: 'JUDICIAL',
        4: 'BANKING',
      };

      // Store in database
      await this.prisma.organizationalArbad.create({
        data: {
          arbadId: BigInt(arbadId.toString()),
          name: request.name,
          orgType: orgTypeMap[orgTypeValue] as any,
          powerBranch: powerBranchMap[powerBranch] as any,
          isActive: true,
        },
      });

      this.logger.log(`Organizational Arbad created. ID: ${arbadId}`);

      return {
        arbadId: Number(arbadId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create org arbad: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add member to Organizational Arbad
   */
  async addOrgMember(request: AddOrgMemberRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Adding member ${request.seatId} to org ${request.arbadId}`);

    try {
      const org = await this.prisma.organizationalArbad.findUnique({
        where: { arbadId: BigInt(request.arbadId) },
        include: { members: true },
      });

      if (!org || !org.isActive) {
        throw new NotFoundException(`Organizational Arbad ${request.arbadId} not found or inactive`);
      }

      // Check if already member
      const existingMember = org.members.find((m) => m.seatId === request.seatId);
      if (existingMember) {
        throw new BadRequestException('Seat is already a member');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.addOrgMember(request.arbadId, request.seatId);
      await tx.wait();

      // Store in database
      await this.prisma.orgArbadMember.create({
        data: {
          arbadId: BigInt(request.arbadId),
          seatId: request.seatId,
        },
      });

      this.logger.log(`Member added to Org Arbad successfully`);

      // Trigger Level 2 allocation for the new member
      await this.allocateLevel2ToMember(request.arbadId.toString(), request.seatId);
    } catch (error) {
      this.logger.error(`Failed to add member: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set leader
   */
  async setOrgLeader(request: SetOrgLeaderRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Setting leader for org ${request.arbadId}: seat ${request.leaderSeatId}`);

    try {
      const org = await this.prisma.organizationalArbad.findUnique({
        where: { arbadId: BigInt(request.arbadId) },
      });

      if (!org || !org.isActive) {
        throw new NotFoundException(`Organizational Arbad ${request.arbadId} not found or inactive`);
      }

      if (org.leaderSeatId) {
        throw new BadRequestException('Leader already set');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setOrgLeader(request.arbadId, request.leaderSeatId);
      await tx.wait();

      // Update database
      await this.prisma.organizationalArbad.update({
        where: { arbadId: BigInt(request.arbadId) },
        data: { leaderSeatId: request.leaderSeatId },
      });

      this.logger.log(`Leader set successfully`);
    } catch (error) {
      this.logger.error(`Failed to set leader: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create department
   */
  async createDepartment(
    request: CreateDepartmentRequest,
    signerWallet: ethers.Wallet,
  ): Promise<CreateOrgArbadResponse> {
    this.logger.log(`Creating department under org ${request.parentOrgId}: ${request.deptName}`);

    try {
      const parent = await this.prisma.organizationalArbad.findUnique({
        where: { arbadId: BigInt(request.parentOrgId) },
      });

      if (!parent || !parent.isActive) {
        throw new NotFoundException(`Parent org ${request.parentOrgId} not found or inactive`);
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.createDepartment(request.parentOrgId, request.deptName);
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'DepartmentCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('DepartmentCreated event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const deptId = parsedEvent?.args.deptId;

      // Store in database
      await this.prisma.organizationalArbad.create({
        data: {
          arbadId: BigInt(deptId.toString()),
          name: request.deptName,
          orgType: parent.orgType,
          powerBranch: parent.powerBranch,
          parentOrgId: BigInt(request.parentOrgId),
          isActive: true,
        },
      });

      this.logger.log(`Department created. ID: ${deptId}`);

      return {
        arbadId: Number(deptId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create department: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get Organizational Arbad by ID
   */
  async getOrgArbad(arbadId: number): Promise<OrganizationalArbad> {
    const org = await this.prisma.organizationalArbad.findUnique({
      where: { arbadId: BigInt(arbadId) },
      include: {
        members: true,
        departments: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organizational Arbad ${arbadId} not found`);
    }

    return {
      arbadId: Number(org.arbadId),
      name: org.name,
      memberSeatIds: org.members.map((m) => m.seatId),
      leaderSeatId: org.leaderSeatId ||  "",
      orgType: this.mapOrgType(org.orgType),
      powerBranch: this.mapPowerBranch(org.powerBranch),
      parentOrgId: org.parentOrgId ? Number(org.parentOrgId) : 0,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  /**
   * Get orgs by type
   */
  async getOrgsByType(orgType: OrganizationType): Promise<OrganizationalArbad[]> {
    const typeMap: Record<OrganizationType, string> = {
      [OrganizationType.NONE]: 'NONE',
      [OrganizationType.EXECUTIVE]: 'EXECUTIVE',
      [OrganizationType.JUDICIAL]: 'JUDICIAL',
      [OrganizationType.BANKING]: 'BANKING',
      [OrganizationType.PRIVATE_COMPANY]: 'PRIVATE_COMPANY',
      [OrganizationType.STATE_COMPANY]: 'STATE_COMPANY',
      [OrganizationType.GUILD]: 'GUILD',
      [OrganizationType.SCIENTIFIC_COUNCIL]: 'SCIENTIFIC_COUNCIL',
      [OrganizationType.EKHE_KHURAL]: 'EKHE_KHURAL',
    };

    const orgs = await this.prisma.organizationalArbad.findMany({
      where: {
        orgType: typeMap[orgType] as any,
        isActive: true,
      },
      include: {
        members: true,
      },
    });

    return orgs.map((org) => ({
      arbadId: Number(org.arbadId),
      name: org.name,
      memberSeatIds: org.members.map((m) => m.seatId),
      leaderSeatId: org.leaderSeatId ||  "",
      orgType: this.mapOrgType(org.orgType),
      powerBranch: this.mapPowerBranch(org.powerBranch),
      parentOrgId: org.parentOrgId ? Number(org.parentOrgId) : 0,
      isActive: org.isActive,
      createdAt: org.createdAt,
    }));
  }

  private mapOrgType(type: string): OrganizationType {
    const map: Record<string, OrganizationType> = {
      NONE: OrganizationType.NONE,
      EXECUTIVE: OrganizationType.EXECUTIVE,
      JUDICIAL: OrganizationType.JUDICIAL,
      BANKING: OrganizationType.BANKING,
      PRIVATE_COMPANY: OrganizationType.PRIVATE_COMPANY,
      STATE_COMPANY: OrganizationType.STATE_COMPANY,
      GUILD: OrganizationType.GUILD,
      SCIENTIFIC_COUNCIL: OrganizationType.SCIENTIFIC_COUNCIL,
      EKHE_KHURAL: OrganizationType.EKHE_KHURAL,
    };
    return map[type] || OrganizationType.NONE;
  }

  private mapPowerBranch(branch: string): number {
    const map: Record<string, number> = {
      NONE: 0,
      LEGISLATIVE: 1,
      EXECUTIVE: 2,
      JUDICIAL: 3,
      BANKING: 4,
    };
    return map[branch] || 0;
  }

  /**
   * Allocate Level 2 funds to member who joined Org Arbad
   * Called automatically after member addition
   */
  private async allocateLevel2ToMember(
    arbadId: string,
    seatId: string,
  ): Promise<void> {
    this.logger.log(
      `Attempting Level 2 allocation for ${seatId} in Org Arbad ${arbadId}`,
    );

    try {
      // Resolve seatId to userId
      const user = await this.prisma.user.findUnique({
        where: { seatId },
        select: { id: true, seatId: true },
      });

      if (!user) {
        this.logger.warn(
          `User with seatId ${seatId} not found. Skipping Level 2 allocation.`,
        );
        return;
      }

      // Attempt allocation
      const result = await this.citizenAllocation.allocateLevel2Funds(
        user.id,
        arbadId,
      );

      if (result.allocated) {
        this.logger.log(
          `✅ Allocated ${result.amount} ALTAN to ${seatId} for Org Arbad membership`,
        );
      } else {
        this.logger.log(
          `ℹ️  User ${seatId} already received Level 2 allocation`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to allocate Level 2 funds to ${seatId}:`,
        error,
      );
      // Don't throw - member addition should still succeed
    }
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { ArbanCompletion_ABI, OrganizationType } from '../blockchain/abis/arbanCompletion.abi';
import { ArbanCompletion__factory } from '../typechain-types/factories/ArbanCompletion__factory';
import {
  OrganizationalArban,
  OrgChart,
  CreateOrgArbanRequest,
  CreateOrgArbanResponse,
  AddOrgMemberRequest,
  SetOrgLeaderRequest,
  CreateDepartmentRequest,
} from './types/arban.types';

@Injectable()
export class OrganizationalArbanService {
  private readonly logger = new Logger(OrganizationalArbanService.name);
  private contract: ReturnType<typeof ArbanCompletion__factory.connect>;

  constructor(private readonly prisma: PrismaService) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const contractAddress = process.env.ARBAN_COMPLETION_ADDRESS || '';
    this.contract = ArbanCompletion__factory.connect(contractAddress, provider);
  }

  /**
   * Create Organizational Arban
   */
  async createOrganizationalArban(
    request: CreateOrgArbanRequest,
    signerWallet: ethers.Wallet,
  ): Promise<CreateOrgArbanResponse> {
    this.logger.log(`Creating Organizational Arban: ${request.name} (${request.orgType})`);

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
      const tx = await contractWithSigner.createOrganizationalArban(request.name, orgTypeValue);
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'OrgArbanCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('OrgArbanCreated event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      const arbanId = parsedEvent?.args.arbanId;
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
      await this.prisma.organizationalArban.create({
        data: {
          arbanId: BigInt(arbanId.toString()),
          name: request.name,
          orgType: orgTypeMap[orgTypeValue] as any,
          powerBranch: powerBranchMap[powerBranch] as any,
          isActive: true,
        },
      });

      this.logger.log(`Organizational Arban created. ID: ${arbanId}`);

      return {
        arbanId: Number(arbanId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create org arban: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add member to Organizational Arban
   */
  async addOrgMember(request: AddOrgMemberRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Adding member ${request.seatId} to org ${request.arbanId}`);

    try {
      const org = await this.prisma.organizationalArban.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
        include: { members: true },
      });

      if (!org || !org.isActive) {
        throw new NotFoundException(`Organizational Arban ${request.arbanId} not found or inactive`);
      }

      // Check if already member
      const existingMember = org.members.find((m) => m.seatId === request.seatId);
      if (existingMember) {
        throw new BadRequestException('Seat is already a member');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.addOrgMember(request.arbanId, request.seatId);
      await tx.wait();

      // Store in database
      await this.prisma.orgArbanMember.create({
        data: {
          arbanId: BigInt(request.arbanId),
          seatId: request.seatId,
        },
      });

      this.logger.log(`Member added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add member: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set leader
   */
  async setOrgLeader(request: SetOrgLeaderRequest, signerWallet: ethers.Wallet): Promise<void> {
    this.logger.log(`Setting leader for org ${request.arbanId}: seat ${request.leaderSeatId}`);

    try {
      const org = await this.prisma.organizationalArban.findUnique({
        where: { arbanId: BigInt(request.arbanId) },
      });

      if (!org || !org.isActive) {
        throw new NotFoundException(`Organizational Arban ${request.arbanId} not found or inactive`);
      }

      if (org.leaderSeatId) {
        throw new BadRequestException('Leader already set');
      }

      // Call smart contract
      const contractWithSigner = this.contract.connect(signerWallet);
      const tx = await contractWithSigner.setOrgLeader(request.arbanId, request.leaderSeatId);
      await tx.wait();

      // Update database
      await this.prisma.organizationalArban.update({
        where: { arbanId: BigInt(request.arbanId) },
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
  ): Promise<CreateOrgArbanResponse> {
    this.logger.log(`Creating department under org ${request.parentOrgId}: ${request.deptName}`);

    try {
      const parent = await this.prisma.organizationalArban.findUnique({
        where: { arbanId: BigInt(request.parentOrgId) },
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
      await this.prisma.organizationalArban.create({
        data: {
          arbanId: BigInt(deptId.toString()),
          name: request.deptName,
          orgType: parent.orgType,
          powerBranch: parent.powerBranch,
          parentOrgId: BigInt(request.parentOrgId),
          isActive: true,
        },
      });

      this.logger.log(`Department created. ID: ${deptId}`);

      return {
        arbanId: Number(deptId),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create department: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get Organizational Arban by ID
   */
  async getOrgArban(arbanId: number): Promise<OrganizationalArban> {
    const org = await this.prisma.organizationalArban.findUnique({
      where: { arbanId: BigInt(arbanId) },
      include: {
        members: true,
        departments: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organizational Arban ${arbanId} not found`);
    }

    return {
      arbanId: Number(org.arbanId),
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
  async getOrgsByType(orgType: OrganizationType): Promise<OrganizationalArban[]> {
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

    const orgs = await this.prisma.organizationalArban.findMany({
      where: {
        orgType: typeMap[orgType] as any,
        isActive: true,
      },
      include: {
        members: true,
      },
    });

    return orgs.map((org) => ({
      arbanId: Number(org.arbanId),
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
}

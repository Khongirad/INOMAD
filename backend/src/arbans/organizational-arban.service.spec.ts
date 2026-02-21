import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationalArbadService } from './organizational-arbad.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  },
}));

jest.mock('../typechain-types/factories/ArbadCompletion__factory', () => ({
  ArbadCompletion__factory: {
    connect: jest.fn().mockReturnValue(null), // Will be overridden in beforeEach
  },
}));

describe('OrganizationalArbadService', () => {
  let service: OrganizationalArbadService;
  let prisma: any;
  let citizenAllocation: any;

  beforeEach(async () => {
    process.env.ARBAD_COMPLETION_ADDRESS = '0xCONTRACT';
    process.env.RPC_URL = 'http://localhost:8545';

    const mockPrisma = {
      organizationalArbad: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          arbadId: BigInt(1), name: 'TestOrg', orgType: 'EXECUTIVE', powerBranch: 'EXECUTIVE',
          leaderSeatId: null, parentOrgId: null, isActive: true, createdAt: new Date(),
          members: [{ seatId: 's1' }], departments: [],
        }),
        findMany: jest.fn().mockResolvedValue([{
          arbadId: BigInt(1), name: 'TestOrg', orgType: 'EXECUTIVE', powerBranch: 'EXECUTIVE',
          leaderSeatId: null, parentOrgId: null, isActive: true, createdAt: new Date(),
          members: [{ seatId: 's1' }],
        }]),
        update: jest.fn().mockResolvedValue({}),
      },
      orgArbadMember: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', seatId: 's1' }) },
    };
    const mockAllocation = {
      allocateLevel2Funds: jest.fn().mockResolvedValue({ allocated: true, amount: '200' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationalArbadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitizenAllocationService, useValue: mockAllocation },
      ],
    }).compile();
    service = module.get(OrganizationalArbadService);
    prisma = module.get(PrismaService);
    citizenAllocation = module.get(CitizenAllocationService);

    // Set up the contract mock directly on the service instance
    const mockInterface = {
      parseLog: jest.fn().mockReturnValue({
        name: 'OrgArbadCreated',
        args: { arbadId: BigInt(1), branch: 2 },
      }),
    };
    (service as any).contract = {
      connect: jest.fn().mockReturnValue({
        createOrganizationalArbad: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({
            hash: '0xTX',
            logs: [{ name: 'OrgArbadCreated' }],
          }),
        }),
        addOrgMember: jest.fn().mockResolvedValue({ wait: jest.fn() }),
        setOrgLeader: jest.fn().mockResolvedValue({ wait: jest.fn() }),
        createDepartment: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({
            hash: '0xTX',
            logs: [{ name: 'DepartmentCreated' }],
          }),
        }),
      }),
      interface: mockInterface,
    };
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('constructor', () => {
    it('handles no address', () => {
      delete process.env.ARBAD_COMPLETION_ADDRESS;
      const s = new OrganizationalArbadService(prisma, citizenAllocation);
      expect(s).toBeDefined();
    });
  });

  describe('createOrganizationalArbad', () => {
    it('creates org with string type', async () => {
      const r = await service.createOrganizationalArbad(
        { name: 'TestOrg', orgType: 'EXECUTIVE' as any }, {} as any,
      );
      expect(r.arbadId).toBe(1);
    });
    it('creates org with numeric type', async () => {
      const r = await service.createOrganizationalArbad(
        { name: 'TestOrg', orgType: 1 as any }, {} as any,
      );
      expect(r.arbadId).toBe(1);
    });
    it('throws on error', async () => {
      (service as any).contract.connect = jest.fn().mockReturnValue({
        createOrganizationalArbad: jest.fn().mockRejectedValue(new Error('fail')),
      });
      await expect(service.createOrganizationalArbad(
        { name: 'TestOrg', orgType: 'EXECUTIVE' as any }, {} as any,
      )).rejects.toThrow('fail');
    });
  });

  describe('addOrgMember', () => {
    it('adds member', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, members: [],
      });
      await service.addOrgMember({ arbadId: 1, seatId: 's2' }, {} as any);
      expect(prisma.orgArbadMember.create).toHaveBeenCalled();
    });
    it('throws when org not found', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue(null);
      await expect(service.addOrgMember({ arbadId: 1, seatId: 's1' }, {} as any)).rejects.toThrow('not found');
    });
    it('throws when already member', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, members: [{ seatId: 's1' }],
      });
      await expect(service.addOrgMember({ arbadId: 1, seatId: 's1' }, {} as any)).rejects.toThrow('already a member');
    });
  });

  describe('setOrgLeader', () => {
    it('sets leader', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, leaderSeatId: null,
      });
      await service.setOrgLeader({ arbadId: 1, leaderSeatId: 's1' }, {} as any);
      expect(prisma.organizationalArbad.update).toHaveBeenCalled();
    });
    it('throws when not found', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue(null);
      await expect(service.setOrgLeader({ arbadId: 1, leaderSeatId: 's1' }, {} as any)).rejects.toThrow('not found');
    });
    it('throws when leader already set', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, leaderSeatId: 's2',
      });
      await expect(service.setOrgLeader({ arbadId: 1, leaderSeatId: 's1' }, {} as any)).rejects.toThrow('already set');
    });
  });

  describe('createDepartment', () => {
    it('creates department', async () => {
      (service as any).contract.interface.parseLog.mockReturnValue({
        name: 'DepartmentCreated', args: { deptId: BigInt(2) },
      });
      prisma.organizationalArbad.findUnique.mockResolvedValue({
        arbadId: BigInt(1), isActive: true, orgType: 'EXECUTIVE', powerBranch: 'EXECUTIVE',
      });
      const r = await service.createDepartment(
        { parentOrgId: 1, deptName: 'Legal' }, {} as any,
      );
      expect(r.arbadId).toBe(2);
    });
    it('throws when parent not found', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue(null);
      await expect(service.createDepartment(
        { parentOrgId: 1, deptName: 'Legal' }, {} as any,
      )).rejects.toThrow('not found');
    });
  });

  describe('getOrgArbad', () => {
    it('returns org', async () => {
      const r = await service.getOrgArbad(1);
      expect(r.arbadId).toBe(1);
    });
    it('throws when not found', async () => {
      prisma.organizationalArbad.findUnique.mockResolvedValue(null);
      await expect(service.getOrgArbad(999)).rejects.toThrow('not found');
    });
  });

  describe('getOrgsByType', () => {
    it('returns orgs', async () => {
      const r = await service.getOrgsByType(1);
      expect(r).toHaveLength(1);
    });
  });

  describe('allocateLevel2ToMember', () => {
    it('allocates successfully', async () => {
      await (service as any).allocateLevel2ToMember('1', 's1');
      expect(citizenAllocation.allocateLevel2Funds).toHaveBeenCalled();
    });
    it('skips when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await (service as any).allocateLevel2ToMember('1', 's1');
    });
    it('logs when already allocated', async () => {
      citizenAllocation.allocateLevel2Funds.mockResolvedValue({ allocated: false });
      await (service as any).allocateLevel2ToMember('1', 's1');
    });
    it('handles error gracefully', async () => {
      citizenAllocation.allocateLevel2Funds.mockRejectedValue(new Error('fail'));
      await (service as any).allocateLevel2ToMember('1', 's1');
    });
  });
});

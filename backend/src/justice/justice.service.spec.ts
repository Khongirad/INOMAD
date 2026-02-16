import { Test, TestingModule } from '@nestjs/testing';
import { CouncilOfJusticeService } from './justice.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('CouncilOfJusticeService', () => {
  let service: CouncilOfJusticeService;
  let prisma: any;
  let blockchain: any;

  const mockMember = {
    id: 'mem-1', memberId: 1, seatId: 'seat-1',
    legalEducationHash: '0xhash', specialization: 'Civil',
    nominatedByArbanId: 'arban-1', walletAddress: '0xjudge1',
    approved: false, approvals: 2, approvedAt: null, createdAt: new Date(),
  };

  const mockCase = {
    id: 'case-1', caseId: 1, plaintiffSeatId: 'seat-1', defendantSeatId: 'seat-2',
    caseHash: '0xcase', description: 'Land dispute', rulingType: 'CIVIL',
    status: 'PENDING', assignedJudge: null, ruling: null, rulingHash: null,
    filedAt: new Date(), ruledAt: null,
  };

  const mockPrecedent = {
    id: 'prec-1', precedentId: 1, sourceCaseId: 1,
    precedentHash: '0xprec', summary: 'landmark ruling',
    legalPrinciple: 'Equal treatment', judge: '0xjudge1', createdAt: new Date(),
  };

  const mockNomination = {
    id: 'nom-1', candidateId: 'user-1', nominatorId: 'user-2',
    status: 'PENDING', notes: 'Great candidate', khuralLevel: 'REPUBLICAN',
    entityId: 'rep-1', specialization: 'Civil', createdAt: new Date(),
    candidate: { id: 'user-1', seatId: 'seat-1', username: 'judge1' },
    nominator: { id: 'user-2', seatId: 'seat-2', username: 'nom1' },
  };

  // Mock blockchain contract
  const mockContract = {
    nominateMember: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [{ fragment: { name: 'MemberNominated' }, args: [1] }],
      }),
    }),
    approveMember: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({}),
    }),
    fileCase: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [{ fragment: { name: 'CaseFiled' }, args: [1] }],
      }),
    }),
    assignCase: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({}),
    }),
    ruleOnCase: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({}),
    }),
    registerPrecedent: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [{ fragment: { name: 'PrecedentRegistered' }, args: [1] }],
      }),
    }),
  };

  const baseMock = (val: any = null) => ({
    findUnique: jest.fn().mockResolvedValue(val),
    findFirst: jest.fn().mockResolvedValue(val),
    findMany: jest.fn().mockResolvedValue(val ? [val] : []),
    create: jest.fn().mockResolvedValue(val),
    update: jest.fn().mockResolvedValue(val),
    count: jest.fn().mockResolvedValue(5),
  });

  beforeEach(async () => {
    prisma = {
      councilOfJusticeMember: baseMock(mockMember),
      judicialCase: baseMock(mockCase),
      legalPrecedent: baseMock(mockPrecedent),
      judgeNomination: baseMock(mockNomination),
    };

    blockchain = {
      getContractWithSigner: jest.fn().mockReturnValue(mockContract),
      getProvider: jest.fn().mockReturnValue({}),
      getWallet: jest.fn().mockReturnValue({
        getAddress: jest.fn().mockResolvedValue('0xjudge1'),
      }),
    };

    // Set env var for contract address
    process.env.COUNCIL_OF_JUSTICE_ADDRESS = '0xcouncil';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouncilOfJusticeService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<CouncilOfJusticeService>(CouncilOfJusticeService);
  });

  afterEach(() => {
    delete process.env.COUNCIL_OF_JUSTICE_ADDRESS;
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  // ── MEMBER MANAGEMENT ──

  describe('nominateMember', () => {
    it('should nominate a judge member', async () => {
      prisma.councilOfJusticeMember.create.mockResolvedValue({ ...mockMember, memberId: 1 });
      const result = await service.nominateMember({
        seatId: 'seat-1', legalEducationHash: '0xhash', specialization: 'Civil',
        arbanId: 'arban-1', walletAddress: '0xjudge1', nominatorPrivateKey: '0xkey',
      });
      expect(result.seatId).toBe('seat-1');
      expect(blockchain.getContractWithSigner).toHaveBeenCalled();
    });
  });

  describe('approveMember', () => {
    it('should approve a member and increment approvals', async () => {
      prisma.councilOfJusticeMember.update.mockResolvedValue({ ...mockMember, approvals: 3 });
      const result = await service.approveMember('mem-1', { judgePrivateKey: '0xkey' });
      expect(result.approvals).toBe(3);
    });

    it('should mark as approved when threshold reached', async () => {
      prisma.councilOfJusticeMember.update.mockResolvedValue({ ...mockMember, approvals: 3, approved: false });
      await service.approveMember('mem-1', { judgePrivateKey: '0xkey' });
      // Second update call should set approved = true
      expect(prisma.councilOfJusticeMember.update).toHaveBeenCalledTimes(2);
    });

    it('should throw error if member not found', async () => {
      prisma.councilOfJusticeMember.findUnique.mockResolvedValue(null);
      await expect(service.approveMember('bad', { judgePrivateKey: '0xkey' })).rejects.toThrow('Member not found');
    });
  });

  describe('getMember', () => {
    it('should return member by id', async () => {
      const result = await service.getMember('mem-1');
      expect(result.seatId).toBe('seat-1');
    });
  });

  describe('getMemberBySeatId', () => {
    it('should return member by seat id', async () => {
      const result = await service.getMemberBySeatId('seat-1');
      expect(result).toBeDefined();
    });
  });

  // ── JUDICIAL CASES ──

  describe('fileCase', () => {
    it('should file a new case', async () => {
      prisma.judicialCase.create.mockResolvedValue({ ...mockCase, caseId: 1 });
      const result = await service.fileCase({
        plaintiffSeatId: 'seat-1', defendantSeatId: 'seat-2',
        caseHash: '0xcase', description: 'Land dispute',
        rulingType: 'CIVIL', filerPrivateKey: '0xkey',
      });
      expect(result.caseId).toBe(1);
      expect(result.status).toBe('PENDING');
    });
  });

  describe('assignCase', () => {
    it('should assign a case to a judge', async () => {
      prisma.judicialCase.update.mockResolvedValue({ ...mockCase, status: 'ASSIGNED', assignedJudge: '0xjudge1' });
      const result = await service.assignCase('case-1', { judgeSeatId: 'seat-1', clerkPrivateKey: '0xkey' });
      expect(result.status).toBe('ASSIGNED');
    });

    it('should throw error if case not found', async () => {
      prisma.judicialCase.findUnique.mockResolvedValue(null);
      await expect(service.assignCase('bad', { judgeSeatId: 'seat-1', clerkPrivateKey: '0xkey' })).rejects.toThrow('Case not found');
    });

    it('should throw error if judge not found', async () => {
      prisma.councilOfJusticeMember.findUnique.mockResolvedValue(null);
      await expect(service.assignCase('case-1', { judgeSeatId: 'bad', clerkPrivateKey: '0xkey' })).rejects.toThrow('Judge not found');
    });
  });

  describe('ruleOnCase', () => {
    it('should rule on a case', async () => {
      prisma.judicialCase.update.mockResolvedValue({ ...mockCase, status: 'RULED', ruling: 'Plaintiff wins' });
      const result = await service.ruleOnCase('case-1', {
        rulingHash: '0xruling', rulingText: 'Plaintiff wins', judgePrivateKey: '0xkey',
      });
      expect(result.status).toBe('RULED');
    });

    it('should throw error if case not found', async () => {
      prisma.judicialCase.findUnique.mockResolvedValue(null);
      await expect(service.ruleOnCase('bad', {
        rulingHash: '0x', rulingText: 'X', judgePrivateKey: '0xkey',
      })).rejects.toThrow('Case not found');
    });
  });

  describe('getCase', () => {
    it('should return case by id', async () => {
      const result = await service.getCase('case-1');
      expect(result).toBeDefined();
    });
  });

  describe('getCasesByPlaintiff', () => {
    it('should return cases by plaintiff', async () => {
      const result = await service.getCasesByPlaintiff('seat-1');
      expect(result).toBeDefined();
    });
  });

  describe('getCasesByDefendant', () => {
    it('should return cases by defendant', async () => {
      const result = await service.getCasesByDefendant('seat-2');
      expect(result).toBeDefined();
    });
  });

  // ── PRECEDENTS ──

  describe('registerPrecedent', () => {
    it('should register a precedent', async () => {
      prisma.legalPrecedent.create.mockResolvedValue(mockPrecedent);
      const result = await service.registerPrecedent({
        caseId: 1, precedentHash: '0xprec', summary: 'landmark ruling',
        legalPrinciple: 'Equal treatment', judgePrivateKey: '0xkey',
      });
      expect(result.precedentId).toBe(1);
    });
  });

  describe('getPrecedent', () => {
    it('should return precedent by id', async () => {
      const result = await service.getPrecedent('prec-1');
      expect(result).toBeDefined();
    });
  });

  describe('getPrecedentsByCase', () => {
    it('should return precedents by case', async () => {
      const result = await service.getPrecedentsByCase(1);
      expect(result).toBeDefined();
    });
  });

  // ── JUDGE NOMINATIONS (DB) ──

  describe('nominateJudge', () => {
    it('should nominate a judge via DB', async () => {
      prisma.judgeNomination.create.mockResolvedValue(mockNomination);
      const result = await service.nominateJudge({
        candidateId: 'user-1', nominatorId: 'user-2', notes: 'Great',
        specialization: 'Civil',
      });
      expect(result.candidateId).toBe('user-1');
    });
  });

  describe('getNominations', () => {
    it('should return all nominations', async () => {
      const result = await service.getNominations();
      expect(result).toBeDefined();
    });
  });

  describe('approveNomination', () => {
    it('should approve a nomination', async () => {
      prisma.judgeNomination.update.mockResolvedValue({ ...mockNomination, status: 'APPROVED' });
      const result = await service.approveNomination('nom-1', 'approver-1');
      expect(result.status).toBe('APPROVED');
    });
  });

  // ── DASHBOARD ──

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      prisma.councilOfJusticeMember.count.mockResolvedValue(10);
      prisma.judicialCase.count
        .mockResolvedValueOnce(25)  // totalCases
        .mockResolvedValueOnce(5);  // pendingCases
      prisma.legalPrecedent.count.mockResolvedValue(8);
      prisma.judicialCase.findMany.mockResolvedValue([mockCase]);

      const result = await service.getDashboardStats();
      expect(result.totalMembers).toBe(10);
      expect(result.totalCases).toBe(25);
      expect(result.pendingCases).toBe(5);
      expect(result.resolvedCases).toBe(20);
      expect(result.totalPrecedents).toBe(8);
    });
  });
});

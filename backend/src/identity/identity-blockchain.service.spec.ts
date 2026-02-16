import { Test, TestingModule } from '@nestjs/testing';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('IdentityBlockchainService', () => {
  let service: IdentityBlockchainService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    const mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      getSeatOwner: jest.fn().mockResolvedValue('0xOWNER'),
      getSeatMetadata: jest.fn().mockResolvedValue({ nationId: 'N1' }),
      getWalletAddress: jest.fn().mockResolvedValue('0xWALLET'),
      isActivated: jest.fn().mockResolvedValue(false),
      isWalletUnlocked: jest.fn().mockResolvedValue(false),
      getAltanBalance: jest.fn().mockResolvedValue('100.0'),
      verifySeatOwnership: jest.fn().mockResolvedValue(true),
      getActivationRegistryContract: jest.fn().mockReturnValue(null),
    };
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityBlockchainService,
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(IdentityBlockchainService);
    blockchain = module.get(BlockchainService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('onModuleInit', () => {
    it('logs enabled when blockchain available', async () => {
      await service.onModuleInit();
    });
    it('logs disabled when blockchain offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      await service.onModuleInit();
    });
  });

  describe('getOnChainStatus', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.getOnChainStatus('1')).toBeNull();
    });
    it('returns full status with wallet', async () => {
      const r = await service.getOnChainStatus('1');
      expect(r!.seatExists).toBe(true);
      expect(r!.walletAddress).toBe('0xWALLET');
      expect(r!.altanBalance).toBe('100.0');
    });
    it('returns status without wallet', async () => {
      blockchain.getWalletAddress.mockResolvedValue(null);
      const r = await service.getOnChainStatus('1');
      expect(r!.walletUnlocked).toBe(false);
      expect(r!.altanBalance).toBeNull();
    });
    it('returns null on error', async () => {
      blockchain.getSeatOwner.mockRejectedValue(new Error('fail'));
      expect(await service.getOnChainStatus('1')).toBeNull();
    });
    it('seat not found', async () => {
      blockchain.getSeatOwner.mockResolvedValue(null);
      const r = await service.getOnChainStatus('1');
      expect(r!.seatExists).toBe(false);
    });
  });

  describe('syncUserFromBlockchain', () => {
    it('returns false when no user', async () => {
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('returns false when no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: null });
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('returns false when on-chain unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: '1' });
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.synced).toBe(false);
    });
    it('syncs wallet address change', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xOLD',
        verificationStatus: 'VERIFIED', walletStatus: 'UNLOCKED',
      });
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.synced).toBe(true);
      expect(r.changes.some((c: string) => c.includes('walletAddress'))).toBe(true);
    });
    it('syncs verification status from activated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xWALLET',
        verificationStatus: 'PENDING', walletStatus: 'LOCKED',
      });
      blockchain.isActivated.mockResolvedValue(true);
      blockchain.isWalletUnlocked.mockResolvedValue(true);
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.changes.length).toBeGreaterThanOrEqual(2);
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('no changes needed', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xWALLET',
        verificationStatus: 'VERIFIED', walletStatus: 'UNLOCKED',
      });
      blockchain.isActivated.mockResolvedValue(true);
      blockchain.isWalletUnlocked.mockResolvedValue(true);
      const r = await service.syncUserFromBlockchain('u1');
      expect(r.synced).toBe(true);
      expect(r.changes).toHaveLength(0);
    });
  });

  describe('verifySeatOwnership', () => {
    it('returns valid:true when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.verifySeatOwnership('1', '0x1');
      expect(r.valid).toBe(true);
      expect(r.reason).toBe('blockchain_offline');
    });
    it('returns valid:true when owner matches', async () => {
      const r = await service.verifySeatOwnership('1', '0x1');
      expect(r.valid).toBe(true);
    });
    it('returns invalid when not owner', async () => {
      blockchain.verifySeatOwnership.mockResolvedValue(false);
      blockchain.getSeatOwner.mockResolvedValue('0xACTUAL');
      const r = await service.verifySeatOwnership('1', '0xWRONG');
      expect(r.valid).toBe(false);
      expect(r.reason).toContain('0xACTUAL');
    });
  });

  describe('canBeVerified', () => {
    it('returns true when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.canBeVerified('1');
      expect(r.canVerify).toBe(true);
    });
    it('returns false when seat not found', async () => {
      blockchain.getSeatOwner.mockResolvedValue(null);
      const r = await service.canBeVerified('1');
      expect(r.canVerify).toBe(false);
    });
    it('returns false when already activated', async () => {
      blockchain.isActivated.mockResolvedValue(true);
      const r = await service.canBeVerified('1');
      expect(r.canVerify).toBe(false);
    });
    it('returns true when seat exists and not activated', async () => {
      const r = await service.canBeVerified('1');
      expect(r.canVerify).toBe(true);
    });
  });

  describe('getVerificationProgress', () => {
    it('returns defaults when no user', async () => {
      const r = await service.getVerificationProgress('u1');
      expect(r.dbVerifications).toBe(0);
      expect(r.ready).toBe(false);
    });
    it('returns progress with on-chain data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', verificationsReceived: [1, 2, 3],
      });
      blockchain.isActivated.mockResolvedValue(true);
      blockchain.isWalletUnlocked.mockResolvedValue(true);
      const r = await service.getVerificationProgress('u1');
      expect(r.dbVerifications).toBe(3);
      expect(r.ready).toBe(true);
      expect(r.onChainActivated).toBe(true);
    });
    it('no on-chain when no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: null, verificationsReceived: [],
      });
      const r = await service.getVerificationProgress('u1');
      expect(r.onChainActivated).toBeNull();
    });
  });

  describe('auditUserState', () => {
    it('returns consistent when no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: null });
      const r = await service.auditUserState('u1');
      expect(r.consistent).toBe(true);
    });
    it('detects discrepancies', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xOLD',
        verificationStatus: 'PENDING', walletStatus: 'LOCKED',
        verificationsReceived: [],
      });
      blockchain.isActivated.mockResolvedValue(true);
      blockchain.isWalletUnlocked.mockResolvedValue(true);
      const r = await service.auditUserState('u1');
      expect(r.consistent).toBe(false);
      expect(r.discrepancies.length).toBeGreaterThanOrEqual(2);
    });
    it('consistent state', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xWALLET',
        verificationStatus: 'VERIFIED', walletStatus: 'UNLOCKED',
        verificationsReceived: [],
      });
      blockchain.isActivated.mockResolvedValue(true);
      blockchain.isWalletUnlocked.mockResolvedValue(true);
      const r = await service.auditUserState('u1');
      expect(r.consistent).toBe(true);
    });
    it('null on-chain status', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', walletAddress: '0xW',
        verificationStatus: 'PENDING', walletStatus: 'LOCKED',
        verificationsReceived: [],
      });
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.auditUserState('u1');
      expect(r.discrepancies).toHaveLength(0);
    });
  });

  describe('getActivationStatus', () => {
    it('returns null when no contract', async () => {
      expect(await service.getActivationStatus('1')).toBeNull();
    });
    it('returns activation data', async () => {
      const mockContract = {
        statusOf: jest.fn().mockResolvedValue(BigInt(2)),
        approvalsCount: jest.fn().mockResolvedValue(BigInt(3)),
        thresholdK: jest.fn().mockResolvedValue(BigInt(5)),
        isActive: jest.fn().mockResolvedValue(true),
        statusWithCourt: jest.fn().mockResolvedValue({ frozen: false, banned: false }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.getActivationStatus('1');
      expect(r!.statusName).toBe('ACTIVE');
      expect(r!.isActive).toBe(true);
    });
    it('returns null on error', async () => {
      const mockContract = {
        statusOf: jest.fn().mockRejectedValue(new Error('fail')),
        approvalsCount: jest.fn(),
        thresholdK: jest.fn(),
        isActive: jest.fn(),
        statusWithCourt: jest.fn(),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      expect(await service.getActivationStatus('1')).toBeNull();
    });
  });

  describe('requestActivation', () => {
    it('returns error when no contract', async () => {
      const r = await service.requestActivation('1', {} as any);
      expect(r.success).toBe(false);
    });
    it('succeeds', async () => {
      const mockContract = {
        connect: jest.fn().mockReturnValue({
          requestActivation: jest.fn().mockResolvedValue({
            wait: jest.fn().mockResolvedValue({ hash: '0xTX' }),
          }),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.requestActivation('1', {} as any);
      expect(r.success).toBe(true);
      expect(r.txHash).toBe('0xTX');
    });
    it('handles NO_CONSTITUTION error', async () => {
      const mockContract = {
        connect: jest.fn().mockReturnValue({
          requestActivation: jest.fn().mockRejectedValue(new Error('NO_CONSTITUTION')),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.requestActivation('1', {} as any);
      expect(r.error).toContain('Constitution');
    });
    it('handles NOT_SEAT_OWNER error', async () => {
      const mockContract = {
        connect: jest.fn().mockReturnValue({
          requestActivation: jest.fn().mockRejectedValue(new Error('NOT_SEAT_OWNER')),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.requestActivation('1', {} as any);
      expect(r.error).toContain('seat owner');
    });
    it('handles NOT_LOCKED error', async () => {
      const mockContract = {
        connect: jest.fn().mockReturnValue({
          requestActivation: jest.fn().mockRejectedValue(new Error('NOT_LOCKED')),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.requestActivation('1', {} as any);
      expect(r.error).toContain('LOCKED');
    });
  });

  describe('approveActivation', () => {
    it('returns error when no contract', async () => {
      const r = await service.approveActivation('1', {} as any);
      expect(r.success).toBe(false);
    });
    it('returns error when not a validator', async () => {
      const mockContract = {
        isValidator: jest.fn().mockResolvedValue(false),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.approveActivation('1', { address: '0x1' } as any);
      expect(r.error).toContain('not a validator');
    });
    it('returns error when already approved', async () => {
      const mockContract = {
        isValidator: jest.fn().mockResolvedValue(true),
        approvedBy: jest.fn().mockResolvedValue(true),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.approveActivation('1', { address: '0x1' } as any);
      expect(r.error).toContain('already approved');
    });
    it('succeeds', async () => {
      const mockContract = {
        isValidator: jest.fn().mockResolvedValue(true),
        approvedBy: jest.fn().mockResolvedValue(false),
        connect: jest.fn().mockReturnValue({
          approveActivation: jest.fn().mockResolvedValue({
            wait: jest.fn().mockResolvedValue({ hash: '0xTX' }),
          }),
        }),
        approvalsCount: jest.fn().mockResolvedValue(BigInt(3)),
        isActive: jest.fn().mockResolvedValue(true),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.approveActivation('1', { address: '0x1' } as any);
      expect(r.success).toBe(true);
      expect(r.isNowActive).toBe(true);
    });
    it('handles NOT_VALIDATOR error', async () => {
      const mockContract = {
        isValidator: jest.fn().mockResolvedValue(true),
        approvedBy: jest.fn().mockResolvedValue(false),
        connect: jest.fn().mockReturnValue({
          approveActivation: jest.fn().mockRejectedValue(new Error('NOT_VALIDATOR')),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.approveActivation('1', { address: '0x1' } as any);
      expect(r.error).toContain('validator');
    });
    it('handles ALREADY_APPROVED error', async () => {
      const mockContract = {
        isValidator: jest.fn().mockResolvedValue(true),
        approvedBy: jest.fn().mockResolvedValue(false),
        connect: jest.fn().mockReturnValue({
          approveActivation: jest.fn().mockRejectedValue(new Error('ALREADY_APPROVED')),
        }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.approveActivation('1', { address: '0x1' } as any);
      expect(r.error).toContain('already approved');
    });
  });

  describe('isValidator', () => {
    it('returns false when no contract', async () => {
      expect(await service.isValidator('0x1')).toBe(false);
    });
    it('returns true', async () => {
      const mockContract = { isValidator: jest.fn().mockResolvedValue(true) };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      expect(await service.isValidator('0x1')).toBe(true);
    });
    it('returns false on error', async () => {
      const mockContract = { isValidator: jest.fn().mockRejectedValue(new Error('fail')) };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      expect(await service.isValidator('0x1')).toBe(false);
    });
  });

  describe('syncActivationToDb', () => {
    it('returns false when no user', async () => {
      const r = await service.syncActivationToDb('u1');
      expect(r.synced).toBe(false);
    });
    it('returns false when no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: null });
      const r = await service.syncActivationToDb('u1');
      expect(r.synced).toBe(false);
    });
    it('returns false when no activation status', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: '1' });
      const r = await service.syncActivationToDb('u1');
      expect(r.synced).toBe(false);
    });
    it('updates DB when on-chain active but DB pending', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', verificationStatus: 'PENDING',
      });
      const mockContract = {
        statusOf: jest.fn().mockResolvedValue(BigInt(2)),
        approvalsCount: jest.fn().mockResolvedValue(BigInt(5)),
        thresholdK: jest.fn().mockResolvedValue(BigInt(3)),
        isActive: jest.fn().mockResolvedValue(true),
        statusWithCourt: jest.fn().mockResolvedValue({ frozen: false, banned: false }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.syncActivationToDb('u1');
      expect(r.synced).toBe(true);
      expect(r.wasActivated).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('no update when already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: '1', verificationStatus: 'VERIFIED',
      });
      const mockContract = {
        statusOf: jest.fn().mockResolvedValue(BigInt(2)),
        approvalsCount: jest.fn().mockResolvedValue(BigInt(5)),
        thresholdK: jest.fn().mockResolvedValue(BigInt(3)),
        isActive: jest.fn().mockResolvedValue(true),
        statusWithCourt: jest.fn().mockResolvedValue({ frozen: false, banned: false }),
      };
      blockchain.getActivationRegistryContract.mockReturnValue(mockContract);
      const r = await service.syncActivationToDb('u1');
      expect(r.synced).toBe(true);
      expect(r.wasActivated).toBe(false);
    });
  });
});

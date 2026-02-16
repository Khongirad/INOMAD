import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { ConfigService } from '@nestjs/config';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Wallet: jest.fn().mockImplementation((pk, provider) => ({ address: '0x123', privateKey: pk })),
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  },
}));

describe('IdentityController', () => {
  let controller: IdentityController;
  let regService: any;
  let verService: any;
  let blockchainService: any;
  let configService: any;

  beforeEach(async () => {
    const mockReg = {
      initiateRegistration: jest.fn().mockResolvedValue({ id: 'u1' }),
      assignTerritory: jest.fn().mockResolvedValue({ territory: 't1' }),
      getUpdatedUser: jest.fn().mockResolvedValue({ id: 'u1', seatId: 's1' }),
    };
    const mockVer = {
      getVerificationStatus: jest.fn().mockResolvedValue({ status: 'PENDING' }),
      submitVerification: jest.fn().mockResolvedValue({ verified: true }),
      superVerify: jest.fn().mockResolvedValue({ superVerified: true }),
    };
    const mockBlockchain = {
      getOnChainStatus: jest.fn().mockResolvedValue({ status: 'active' }),
      getVerificationProgress: jest.fn().mockResolvedValue({ progress: 50 }),
      syncUserFromBlockchain: jest.fn().mockResolvedValue({ synced: true }),
      auditUserState: jest.fn().mockResolvedValue({ audit: 'ok' }),
      getActivationStatus: jest.fn().mockResolvedValue({ activated: true }),
      requestActivation: jest.fn().mockResolvedValue({ requested: true }),
      approveActivation: jest.fn().mockResolvedValue({ approved: true }),
      isValidator: jest.fn().mockResolvedValue(true),
      syncActivationToDb: jest.fn().mockResolvedValue({ synced: true }),
    };
    const mockConfig = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'RPC_URL') return 'http://localhost:8545';
        if (key === 'DEFAULT_SIGNER_KEY') return '0xDEFAULT';
        return null;
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [
        { provide: RegistrationService, useValue: mockReg },
        { provide: VerificationService, useValue: mockVer },
        { provide: IdentityBlockchainService, useValue: mockBlockchain },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    controller = module.get(IdentityController);
    regService = module.get(RegistrationService);
    verService = module.get(VerificationService);
    blockchainService = module.get(IdentityBlockchainService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('register', async () => {
    const dto = { birthPlace: { district: 'D1', city: 'C1' } } as any;
    const r = await controller.register(dto);
    expect(r.user.seatId).toBe('s1');
    expect(regService.assignTerritory).toHaveBeenCalledWith('u1', 'D1');
  });
  it('register with city fallback', async () => {
    const dto = { birthPlace: { city: 'C1' } } as any;
    await controller.register(dto);
    expect(regService.assignTerritory).toHaveBeenCalledWith('u1', 'C1');
  });

  it('getStatus', async () => { await controller.getStatus('u1'); expect(verService.getVerificationStatus).toHaveBeenCalledWith('u1'); });
  it('verify', async () => { await controller.verify({ user: { seatId: 's1' } }, { targetUserId: 'u2' } as any); expect(verService.submitVerification).toHaveBeenCalledWith('s1', 'u2'); });
  it('superVerify', async () => { await controller.superVerify({ user: { seatId: 's1' } }, { targetUserId: 'u2', justification: 'J' } as any); expect(verService.superVerify).toHaveBeenCalledWith('s1', 'u2', 'J'); });

  it('getBlockchainStatus', async () => { await controller.getBlockchainStatus('s1'); expect(blockchainService.getOnChainStatus).toHaveBeenCalledWith('s1'); });
  it('getVerificationProgress', async () => { await controller.getVerificationProgress('u1'); expect(blockchainService.getVerificationProgress).toHaveBeenCalledWith('u1'); });
  it('syncFromBlockchain', async () => { await controller.syncFromBlockchain('u1'); expect(blockchainService.syncUserFromBlockchain).toHaveBeenCalledWith('u1'); });
  it('auditUserState', async () => { await controller.auditUserState('u1'); expect(blockchainService.auditUserState).toHaveBeenCalledWith('u1'); });

  it('getActivationStatus', async () => { await controller.getActivationStatus('s1'); expect(blockchainService.getActivationStatus).toHaveBeenCalledWith('s1'); });

  it('requestActivation with seatId', async () => {
    const r = await controller.requestActivation({ user: { seatId: 's1' } }, { privateKey: '0xPK' } as any);
    expect(blockchainService.requestActivation).toHaveBeenCalled();
  });
  it('requestActivation no seatId', async () => {
    const r = await controller.requestActivation({ user: {} }, {} as any);
    expect(r).toEqual({ success: false, error: 'No seatId found for user' });
  });
  it('requestActivation no privateKey but default key exists', async () => {
    const r = await controller.requestActivation({ user: { seatId: 's1' } }, {} as any);
    expect(blockchainService.requestActivation).toHaveBeenCalled();
  });
  it('requestActivation no privateKey no default', async () => {
    configService.get.mockReturnValue(null);
    const r = await controller.requestActivation({ user: { seatId: 's1' } }, {} as any);
    expect(r).toEqual({ success: false, error: 'Private key required' });
  });

  it('approveActivation', async () => {
    const r = await controller.approveActivation({ seatId: 's1', privateKey: '0xPK' } as any);
    expect(blockchainService.approveActivation).toHaveBeenCalled();
  });
  it('approveActivation no seatId', async () => {
    const r = await controller.approveActivation({} as any);
    expect(r).toEqual({ success: false, error: 'seatId is required' });
  });
  it('approveActivation no privateKey no default', async () => {
    configService.get.mockReturnValue(null);
    const r = await controller.approveActivation({ seatId: 's1' } as any);
    expect(r).toEqual({ success: false, error: 'Private key required for validator' });
  });

  it('isValidator', async () => { const r = await controller.isValidator('0x123'); expect(r.isValidator).toBe(true); });
  it('syncActivation', async () => { await controller.syncActivation('u1'); expect(blockchainService.syncActivationToDb).toHaveBeenCalledWith('u1'); });
});

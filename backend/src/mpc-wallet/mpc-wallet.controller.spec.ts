import { Test, TestingModule } from '@nestjs/testing';
import { MPCWalletController } from './mpc-wallet.controller';
import { MPCWalletService } from './mpc-wallet.service';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MPCWalletController', () => {
  let controller: MPCWalletController;
  let walletService: any;
  let recoveryService: any;

  const req = { user: { sub: 'u1', userId: 'u1' } };
  const mockWallet = {
    id: 'w1', address: '0xABC', status: 'ACTIVE',
    recoveryMethod: 'EMAIL', guardians: [{ id: 'g1' }],
    smartAccount: null, createdAt: new Date(), lastUsedAt: new Date(),
  };

  beforeEach(async () => {
    walletService = {
      createWallet: jest.fn().mockResolvedValue({
        address: '0xABC', deviceShare: 'share123', walletId: 'w1',
      }),
      getWallet: jest.fn().mockResolvedValue(mockWallet),
      signTransaction: jest.fn().mockResolvedValue({ signedTx: '0xSIGNED', hash: '0xHASH' }),
      signMessage: jest.fn().mockResolvedValue('0xSIG'),
      migrateFromPrivateKey: jest.fn().mockResolvedValue({
        address: '0xNEW', deviceShare: 'newShare', walletId: 'w2',
      }),
    };
    recoveryService = {
      addGuardian: jest.fn().mockResolvedValue({ id: 'g-new', type: 'EMAIL' }),
      getGuardians: jest.fn().mockResolvedValue([{ id: 'g1' }]),
      suggestGuardians: jest.fn().mockResolvedValue([{ userId: 'u2', name: 'Alice' }]),
      initiateRecovery: jest.fn().mockResolvedValue({
        id: 's1', method: 'EMAIL', requiredApprovals: 2,
        expiresAt: new Date(),
      }),
      confirmRecovery: jest.fn().mockResolvedValue({ recovered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MPCWalletController],
      providers: [
        { provide: MPCWalletService, useValue: walletService },
        { provide: RecoveryService, useValue: recoveryService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MPCWalletController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates wallet', async () => {
    const r = await controller.createWallet(req, {});
    expect(r.success).toBe(true);
    expect(r.data.address).toBe('0xABC');
    expect(r.data.deviceShare).toBe('share123');
  });

  it('gets my wallet', async () => {
    const r = await controller.getMyWallet(req);
    expect(r.success).toBe(true);
    expect(r.data.address).toBe('0xABC');
    expect(r.data.guardianCount).toBe(1);
  });

  it('signs transaction', async () => {
    const r = await controller.signTransaction(req, {
      deviceShare: 'share',
      transaction: { to: '0xDEST', value: '1000' },
    });
    expect(r.success).toBe(true);
    expect(r.data.hash).toBe('0xHASH');
  });

  it('signs message', async () => {
    const r = await controller.signMessage(req, {
      deviceShare: 'share', message: 'Hello',
    });
    expect(r.success).toBe(true);
    expect(r.data.signature).toBe('0xSIG');
  });

  it('migrates wallet', async () => {
    const r = await controller.migrateWallet(req, { privateKey: '0xOLD' });
    expect(r.success).toBe(true);
    expect(r.data.address).toBe('0xNEW');
  });

  it('adds guardian', async () => {
    const r = await controller.addGuardian(req, {
      guardianType: 'EMAIL' as any, guardianRef: 'test@email.com',
    });
    expect(r.success).toBe(true);
  });

  it('gets guardians', async () => {
    const r = await controller.getGuardians(req);
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(1);
  });

  it('suggests guardians', async () => {
    const r = await controller.suggestGuardians(req);
    expect(r.success).toBe(true);
    expect(r.data[0].name).toBe('Alice');
  });

  it('initiates recovery', async () => {
    const r = await controller.initiateRecovery({
      address: '0xABC', method: 'EMAIL' as any,
    });
    expect(r.success).toBe(true);
    expect(r.data.sessionId).toBe('s1');
  });

  it('confirms recovery', async () => {
    const r = await controller.confirmRecovery({
      sessionId: 's1', verificationCode: '123456',
    });
    expect(r.success).toBe(true);
    expect(r.success).toBe(true);
    expect(r.data).toBeDefined();
  });
});

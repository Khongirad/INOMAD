import { Test, TestingModule } from '@nestjs/testing';
import { AccountRecoveryService, generateBiometricHash } from './account-recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
  compare: jest.fn(),
}));

// We track what UUID was generated so we can assert on it
const FAKE_TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
let uuidSpy: jest.SpyInstance;

describe('generateBiometricHash', () => {
  it('produces a 64-char hex string', () => {
    const hash = generateBiometricHash('Баир Иванов', '1990-05-15', 'Ulan-Ude');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('is case-insensitive and space-normalized', () => {
    const h1 = generateBiometricHash('баир  иванов', '1990-05-15', 'ulan-ude');
    const h2 = generateBiometricHash('Баир Иванов', '1990-05-15', 'Ulan-Ude');
    expect(h1).toBe(h2);
  });

  it('differs when any field differs', () => {
    const base = generateBiometricHash('Alice', '1990-01-01', 'Moscow');
    expect(generateBiometricHash('Bob', '1990-01-01', 'Moscow')).not.toBe(base);
    expect(generateBiometricHash('Alice', '1991-01-01', 'Moscow')).not.toBe(base);
    expect(generateBiometricHash('Alice', '1990-01-01', 'Novosibirsk')).not.toBe(base);
  });
});

describe('AccountRecoveryService', () => {
  let service: AccountRecoveryService;
  let prisma: any;

  const mockUser = {
    id: 'u1',
    seatId: 'KHURAL-ABC',
    username: 'alice',
    isVerified: true,
    fullName: 'Alice Smith',
    dateOfBirth: new Date('1990-05-15'),
    secretQuestion: "What is your mother's maiden name?",
    secretAnswerHash: '$2b$10$hashed',
  };

  const mockRequest = {
    id: 'req1',
    claimedUsername: 'alice',
    claimedFullName: 'Alice Smith',
    claimedBirthDate: new Date('1990-05-15'),
    status: 'AWAITING_GUARANTOR',
    guarantorSeatId: 'KHURAL-ABC',
    recoveryMethod: 'GUARANTOR',
    recoveryToken: null,
    recoveryTokenUsed: false,
    recoveryTokenExpires: null,
  };

  beforeEach(async () => {
    uuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(FAKE_TOKEN as any);

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      accountRecoveryRequest: {
        create: jest.fn().mockResolvedValue({ ...mockRequest }),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      authSession: {
        updateMany: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRecoveryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AccountRecoveryService);
  });

  afterEach(() => {
    uuidSpy.mockRestore();
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── setSecretQuestion ────────────────────────────────────────────────────

  describe('setSecretQuestion', () => {
    it('saves a valid question and hashed answer', async () => {
      const result = await service.setSecretQuestion(
        'u1',
        "What is your mother's maiden name?",
        'Smith',
      );
      expect(result.ok).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('smith', 10);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ secretQuestion: "What is your mother's maiden name?" }),
        }),
      );
    });

    it('rejects invalid question', async () => {
      await expect(service.setSecretQuestion('u1', 'Fake question?', 'Smith'))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects answer shorter than 3 chars', async () => {
      await expect(
        service.setSecretQuestion('u1', "What is your mother's maiden name?", 'ab'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── setBiometricIdentity ─────────────────────────────────────────────────

  describe('setBiometricIdentity', () => {
    it('sets biometric hash for first-time call', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.setBiometricIdentity('u1', 'Alice Smith', '1990-05-15', 'Ulan-Ude');
      expect(result.ok).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });

    it('allows same user to update their own hash', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' }); // same user
      const result = await service.setBiometricIdentity('u1', 'Alice Smith', '1990-05-15', 'Ulan-Ude');
      expect(result.ok).toBe(true);
    });

    it('rejects duplicate identity from different user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-other' }); // different user
      await expect(
        service.setBiometricIdentity('u1', 'Alice Smith', '1990-05-15', 'Ulan-Ude'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── requestViaGuarantor ──────────────────────────────────────────────────

  describe('requestViaGuarantor', () => {
    const validUser = mockUser;
    const validGuarantor = { id: 'g1', username: 'bob', isVerified: true, seatId: 'KHURAL-GUAR' };

    it('creates a guarantor recovery request', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(validUser)      // validateIdentityClaim
        .mockResolvedValueOnce(validGuarantor); // find guarantor
      const result = await service.requestViaGuarantor({
        claimedUsername: 'alice',
        claimedFullName: 'Alice Smith',
        claimedBirthDate: '1990-05-15',
        guarantorSeatId: 'KHURAL-GUAR',
      });
      expect(result.ok).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(prisma.accountRecoveryRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recoveryMethod: 'GUARANTOR',
            status: 'AWAITING_GUARANTOR',
            guarantorSeatId: 'KHURAL-GUAR',
          }),
        }),
      );
    });

    it('rejects if guarantor not found', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(validUser)
        .mockResolvedValueOnce(null); // no guarantor
      await expect(
        service.requestViaGuarantor({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', guarantorSeatId: 'KHURAL-FAKE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects if guarantor is not verified', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(validUser)
        .mockResolvedValueOnce({ id: 'g1', isVerified: false, seatId: 'KHURAL-GUAR' });
      await expect(
        service.requestViaGuarantor({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', guarantorSeatId: 'KHURAL-GUAR',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate pending request', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(validUser)
        .mockResolvedValueOnce(validGuarantor);
      prisma.accountRecoveryRequest.findFirst.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.requestViaGuarantor({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', guarantorSeatId: 'KHURAL-GUAR',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── confirmAsGuarantor ───────────────────────────────────────────────────

  describe('confirmAsGuarantor', () => {
    it('confirms and issues recovery token', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue({ seatId: 'KHURAL-ABC', isVerified: true });

      const result = await service.confirmAsGuarantor('g1', 'req1');
      expect(result.ok).toBe(true);
      expect(prisma.accountRecoveryRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            recoveryToken: FAKE_TOKEN,
            guarantorConfirmed: true,
          }),
        }),
      );
    });

    it('rejects if request not in AWAITING_GUARANTOR state', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue({
        ...mockRequest, status: 'APPROVED',
      });
      await expect(service.confirmAsGuarantor('g1', 'req1')).rejects.toThrow(BadRequestException);
    });

    it('rejects if caller is not the designated guarantor', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.user.findUnique.mockResolvedValue({ seatId: 'KHURAL-WRONG', isVerified: true });
      await expect(service.confirmAsGuarantor('g1', 'req1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects if request not found', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue(null);
      await expect(service.confirmAsGuarantor('g1', 'req1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── requestViaSecretQuestion ─────────────────────────────────────────────

  describe('requestViaSecretQuestion', () => {
    it('issues token immediately on correct answer', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.requestViaSecretQuestion({
        claimedUsername: 'alice',
        claimedFullName: 'Alice Smith',
        claimedBirthDate: '1990-05-15',
        secretAnswer: 'Smith',
      });
      expect(result.ok).toBe(true);
      expect(result.recoveryToken).toBe(FAKE_TOKEN);
      expect(result.expiresAt).toBeDefined();
    });

    it('rejects wrong answer', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(
        service.requestViaSecretQuestion({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', secretAnswer: 'WRONG',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects if no secret question set', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, secretQuestion: null, secretAnswerHash: null });
      await expect(
        service.requestViaSecretQuestion({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', secretAnswer: 'Smith',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── resetPasswordWithToken ───────────────────────────────────────────────

  describe('resetPasswordWithToken', () => {
    const validRequest = {
      id: 'req1',
      claimedUsername: 'alice',
      status: 'APPROVED',
      recoveryToken: FAKE_TOKEN,
      recoveryTokenUsed: false,
      recoveryTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1h from now
    };

    it('resets password and revokes all sessions', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue(validRequest);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      const result = await service.resetPasswordWithToken(FAKE_TOKEN, 'NewPass123');
      expect(result.ok).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRevoked: true } }),
      );
      expect(prisma.accountRecoveryRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', recoveryTokenUsed: true }),
        }),
      );
    });

    it('rejects invalid token', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPasswordWithToken('bad-token', 'NewPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects already-used token', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue({
        ...validRequest, recoveryTokenUsed: true,
      });
      await expect(
        service.resetPasswordWithToken(FAKE_TOKEN, 'NewPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects expired token', async () => {
      prisma.accountRecoveryRequest.findUnique.mockResolvedValue({
        ...validRequest,
        recoveryTokenExpires: new Date(Date.now() - 1000), // expired
      });
      await expect(
        service.resetPasswordWithToken(FAKE_TOKEN, 'NewPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects weak new password', async () => {
      await expect(
        service.resetPasswordWithToken(FAKE_TOKEN, 'short'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects password without numbers', async () => {
      await expect(
        service.resetPasswordWithToken(FAKE_TOKEN, 'onlyletters'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects password without letters', async () => {
      await expect(
        service.resetPasswordWithToken(FAKE_TOKEN, '12345678'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── validateIdentityClaim (via public paths) ──────────────────────────────

  describe('identity claim validation', () => {
    it('rejects unknown username (via secret question path)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.requestViaSecretQuestion({
          claimedUsername: 'nobody', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1990-05-15', secretAnswer: 'Smith',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects mismatched full name', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, secretAnswer: null });
      await expect(
        service.requestViaSecretQuestion({
          claimedUsername: 'alice', claimedFullName: 'Definitely Not Alice',
          claimedBirthDate: '1990-05-15', secretAnswer: 'Smith',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects mismatched date of birth', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.requestViaSecretQuestion({
          claimedUsername: 'alice', claimedFullName: 'Alice Smith',
          claimedBirthDate: '1999-01-01', // wrong DOB
          secretAnswer: 'Smith',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

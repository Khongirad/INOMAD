import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

export const SECRET_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What was the name of your childhood pet?',
  'What city were you born in?',
  'What is the name of the street you grew up on?',
  'What was the model of your first car?',
  "What is your paternal grandmother's first name?",
  'What was the name of your closest childhood friend?',
  'What is your oldest sibling\'s middle name?',
  'In what city did your parents meet?',
];

/**
 * Generates a deterministic biometric identity hash.
 * SHA-256 of: normalize(fullName) + | + normalize(dateOfBirth) + | + normalize(birthCity)
 * Privacy-safe: hash cannot be reversed to get the name
 */
export function generateBiometricHash(
  fullName: string,
  dateOfBirth: Date | string,
  birthCity: string,
): string {
  const normalized = [
    fullName.toLowerCase().trim().replace(/\s+/g, ' '),
    new Date(dateOfBirth).toISOString().split('T')[0], // YYYY-MM-DD
    birthCity.toLowerCase().trim(),
  ].join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

@Injectable()
export class AccountRecoveryService {
  constructor(private prisma: PrismaService) {}

  // ─── Set Secret Question (called after profile creation) ───────────────────

  async setSecretQuestion(
    userId: string,
    question: string,
    answer: string,
  ): Promise<{ ok: true; message: string }> {
    if (!SECRET_QUESTIONS.includes(question)) {
      throw new BadRequestException('Invalid secret question');
    }
    if (!answer || answer.trim().length < 3) {
      throw new BadRequestException('Answer must be at least 3 characters long');
    }

    const answerHash = await bcrypt.hash(answer.toLowerCase().trim(), 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        secretQuestion: question,
        secretAnswerHash: answerHash,
      },
    });

    return { ok: true, message: 'Secret question set successfully' };
  }

  // ─── Set Biometric Identity (on passport/profile completion) ───────────────

  async setBiometricIdentity(
    userId: string,
    fullName: string,
    dateOfBirth: Date | string,
    birthCity: string,
  ): Promise<{ ok: true }> {
    const hash = generateBiometricHash(fullName, dateOfBirth, birthCity);

    // Check if another user already has this biometric hash
    const existing = await this.prisma.user.findUnique({
      where: { biometricIdentityHash: hash },
      select: { id: true },
    });

    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'An account with this identity already exists. Duplicate accounts are not permitted.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
        biometricIdentityHash: hash,
        fullNameLocked: true,
      },
    });

    return { ok: true };
  }

  // ─── REQUEST: Via Guarantor (Path A) ───────────────────────────────────────

  async requestViaGuarantor(dto: {
    claimedUsername: string;
    claimedFullName: string;
    claimedBirthDate: string;
    claimedBirthCity?: string;
    guarantorSeatId: string;
    claimedPassportNumber?: string;
  }): Promise<{ ok: true; requestId: string; message: string }> {
    const user = await this.validateIdentityClaim(
      dto.claimedUsername,
      dto.claimedFullName,
      dto.claimedBirthDate,
    );

    // Verify guarantor exists and is verified
    const guarantor = await this.prisma.user.findUnique({
      where: { seatId: dto.guarantorSeatId },
      select: { id: true, username: true, isVerified: true, seatId: true },
    });

    if (!guarantor) throw new NotFoundException('Guarantor not found with that Seat ID');
    if (!guarantor.isVerified) throw new BadRequestException('The guarantor must be a verified citizen');

    // Check for duplicate pending requests
    const existingPending = await this.prisma.accountRecoveryRequest.findFirst({
      where: { claimedUsername: dto.claimedUsername, status: 'PENDING' },
    });
    if (existingPending) {
      throw new ConflictException('A recovery request is already pending for this account');
    }

    const request = await this.prisma.accountRecoveryRequest.create({
      data: {
        claimedUsername: dto.claimedUsername,
        claimedFullName: dto.claimedFullName.trim(),
        claimedBirthDate: new Date(dto.claimedBirthDate),
        claimedBirthCity: dto.claimedBirthCity,
        claimedPassportNumber: dto.claimedPassportNumber,
        recoveryMethod: 'GUARANTOR',
        guarantorSeatId: dto.guarantorSeatId,
        status: 'AWAITING_GUARANTOR',
      },
    });

    // TODO: Send notification to guarantor (notification service)

    return {
      ok: true,
      requestId: request.id,
      message: `Recovery request sent to ${guarantor.username}. They must confirm your identity from their dashboard.`,
    };
  }

  // ─── GUARANTOR CONFIRMS (Path A — called by guarantor) ────────────────────

  async confirmAsGuarantor(
    guarantorUserId: string,
    requestId: string,
  ): Promise<{ ok: true; message: string }> {
    const request = await this.prisma.accountRecoveryRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Recovery request not found');
    if (request.status !== 'AWAITING_GUARANTOR') {
      throw new BadRequestException('This request is not awaiting guarantor confirmation');
    }

    const guarantor = await this.prisma.user.findUnique({
      where: { id: guarantorUserId },
      select: { seatId: true, isVerified: true },
    });

    if (!guarantor || guarantor.seatId !== request.guarantorSeatId) {
      throw new ForbiddenException('You are not the designated guarantor for this request');
    }

    // Issue recovery token (valid for 1 hour)
    const recoveryToken = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.accountRecoveryRequest.update({
      where: { id: requestId },
      data: {
        guarantorConfirmed: true,
        guarantorConfirmedAt: new Date(),
        guarantorConfirmedById: guarantorUserId,
        status: 'APPROVED',
        recoveryToken,
        recoveryTokenAt: new Date(),
        recoveryTokenExpires: expires,
      },
    });

    return {
      ok: true,
      message: `You have confirmed this identity. A recovery token has been issued. Token expires in 1 hour.`,
    };
  }

  // ─── REQUEST: Via Secret Question (Path 2.1) ───────────────────────────────

  async requestViaSecretQuestion(dto: {
    claimedUsername: string;
    claimedFullName: string;
    claimedBirthDate: string;
    secretAnswer: string;
  }): Promise<{ ok: true; recoveryToken: string; expiresAt: string }> {
    const user = await this.validateIdentityClaim(
      dto.claimedUsername,
      dto.claimedFullName,
      dto.claimedBirthDate,
    );

    if (!user.secretAnswerHash || !user.secretQuestion) {
      throw new BadRequestException(
        'No secret question is set for this account. Use another recovery method.',
      );
    }

    const isAnswerCorrect = await bcrypt.compare(
      dto.secretAnswer.toLowerCase().trim(),
      user.secretAnswerHash,
    );

    if (!isAnswerCorrect) {
      throw new UnauthorizedException('Incorrect answer to the secret question');
    }

    // Issue recovery token immediately
    const recoveryToken = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.accountRecoveryRequest.create({
      data: {
        claimedUsername: dto.claimedUsername,
        claimedFullName: dto.claimedFullName.trim(),
        claimedBirthDate: new Date(dto.claimedBirthDate),
        recoveryMethod: 'SECRET_QUESTION',
        status: 'APPROVED',
        recoveryToken,
        recoveryTokenAt: new Date(),
        recoveryTokenExpires: expires,
      },
    });

    return {
      ok: true,
      recoveryToken,
      expiresAt: expires.toISOString(),
    };
  }

  // ─── REQUEST: Via Official Organs (Path 2.2) ───────────────────────────────

  async requestViaOfficialOrgans(dto: {
    claimedUsername: string;
    claimedFullName: string;
    claimedBirthDate: string;
    claimedBirthCity?: string;
    claimedPassportNumber: string;
    claimedPassportSeries?: string;
    claimedPassportIssuedBy?: string;
    officialServiceType: 'MIGRATION_SERVICE' | 'COUNCIL';
  }): Promise<{ ok: true; requestId: string; message: string }> {
    await this.validateIdentityClaim(
      dto.claimedUsername,
      dto.claimedFullName,
      dto.claimedBirthDate,
    );

    const existingPending = await this.prisma.accountRecoveryRequest.findFirst({
      where: { claimedUsername: dto.claimedUsername, status: { in: ['PENDING', 'AWAITING_OFFICIAL'] } },
    });
    if (existingPending) {
      throw new ConflictException('A recovery request is already pending for this account');
    }

    const request = await this.prisma.accountRecoveryRequest.create({
      data: {
        claimedUsername: dto.claimedUsername,
        claimedFullName: dto.claimedFullName.trim(),
        claimedBirthDate: new Date(dto.claimedBirthDate),
        claimedBirthCity: dto.claimedBirthCity,
        claimedPassportNumber: dto.claimedPassportNumber,
        claimedPassportSeries: dto.claimedPassportSeries,
        claimedPassportIssuedBy: dto.claimedPassportIssuedBy,
        recoveryMethod: 'OFFICIAL_ORGANS',
        officialServiceType: dto.officialServiceType,
        status: 'AWAITING_OFFICIAL',
      },
    });

    return {
      ok: true,
      requestId: request.id,
      message: `Your request has been submitted to the ${dto.officialServiceType === 'MIGRATION_SERVICE' ? 'Migration Service' : 'Council'} for identity verification. You will be notified when approved.`,
    };
  }

  // ─── ADMIN: Approve Official Request (Path 2.2) ───────────────────────────

  async officialApprove(
    adminUserId: string,
    requestId: string,
    approved: boolean,
    note?: string,
  ): Promise<{ ok: true; message: string }> {
    const request = await this.prisma.accountRecoveryRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Recovery request not found');
    if (request.status !== 'AWAITING_OFFICIAL') {
      throw new BadRequestException('This request is not awaiting official approval');
    }

    if (!approved) {
      await this.prisma.accountRecoveryRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', resolvedAt: new Date(), resolvedNote: note, officialApprovedById: adminUserId },
      });
      return { ok: true, message: 'Recovery request rejected' };
    }

    const recoveryToken = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.accountRecoveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        officialApprovedAt: new Date(),
        officialApprovedById: adminUserId,
        recoveryToken,
        recoveryTokenAt: new Date(),
        recoveryTokenExpires: expires,
        resolvedNote: note,
      },
    });

    return { ok: true, message: 'Recovery request approved. Token issued for 1 hour.' };
  }

  // ─── Reset Password With Recovery Token ───────────────────────────────────

  async resetPasswordWithToken(
    recoveryToken: string,
    newPassword: string,
  ): Promise<{ ok: true; message: string }> {
    // Validate password policy
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    if (!hasLetters || !hasNumbers) {
      throw new BadRequestException('Password must contain both letters and numbers');
    }

    const request = await this.prisma.accountRecoveryRequest.findUnique({
      where: { recoveryToken },
    });

    if (!request) throw new UnauthorizedException('Invalid or expired recovery token');
    if (request.recoveryTokenUsed) throw new UnauthorizedException('Recovery token has already been used');
    if (request.status !== 'APPROVED') throw new UnauthorizedException('Recovery request is not approved');
    if (request.recoveryTokenExpires && request.recoveryTokenExpires < new Date()) {
      await this.prisma.accountRecoveryRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Recovery token has expired');
    }

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { username: request.claimedUsername },
    });
    if (!user) throw new NotFoundException('User account not found');

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all existing sessions (security: invalidate old sessions after recovery)
    await this.prisma.authSession.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    // Mark token as used and request as completed
    await this.prisma.accountRecoveryRequest.update({
      where: { id: request.id },
      data: { status: 'COMPLETED', recoveryTokenUsed: true, resolvedAt: new Date() },
    });

    return { ok: true, message: 'Password reset successfully. All existing sessions have been revoked.' };
  }

  // ─── Admin: Get Pending Requests ──────────────────────────────────────────

  async getPendingRequests(method?: 'GUARANTOR' | 'SECRET_QUESTION' | 'OFFICIAL_ORGANS') {
    return this.prisma.accountRecoveryRequest.findMany({
      where: {
        status: method === 'OFFICIAL_ORGANS' ? 'AWAITING_OFFICIAL' : { in: ['PENDING', 'AWAITING_GUARANTOR', 'AWAITING_OFFICIAL'] },
        ...(method ? { recoveryMethod: method } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Get Recovery Request (for guarantor to view) ─────────────────────────

  async getRecoveryRequest(requestId: string) {
    const request = await this.prisma.accountRecoveryRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Recovery request not found');
    return request;
  }

  // ─── Validate identity claim (shared by all paths) ────────────────────────

  private async validateIdentityClaim(
    username: string,
    fullName: string,
    birthDate: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        secretQuestion: true,
        secretAnswerHash: true,
        isVerified: true,
      },
    });

    if (!user) {
      // Always throw the same error to avoid username enumeration
      throw new UnauthorizedException('Identity claim could not be verified');
    }

    // Validate full name matches (case-insensitive)
    if (
      user.fullName &&
      user.fullName.toLowerCase().trim() !== fullName.toLowerCase().trim()
    ) {
      throw new UnauthorizedException('Identity claim could not be verified');
    }

    // Validate date of birth matches
    if (user.dateOfBirth) {
      const claimedDOB = new Date(birthDate).toISOString().split('T')[0];
      const storedDOB = user.dateOfBirth.toISOString().split('T')[0];
      if (claimedDOB !== storedDOB) {
        throw new UnauthorizedException('Identity claim could not be verified');
      }
    }

    return user;
  }
}

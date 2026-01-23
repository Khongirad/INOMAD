import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BankAuthService, BankTicketPayload } from './bank-auth.service';
import { Request } from 'express';

export interface BankAuthenticatedRequest extends Request {
  bankUser: BankTicketPayload;
}

/**
 * Bank Auth Guard.
 *
 * Validates bank tickets (NOT auth JWTs).
 * Uses BANK_JWT_SECRET — completely separate from AUTH_JWT_SECRET.
 * Rejects any auth-layer tokens.
 */
@Injectable()
export class BankAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private bankAuthService: BankAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bank authorization token');
    }

    try {
      const payload = this.jwtService.verify<BankTicketPayload>(token, {
        secret: this.configService.get<string>('BANK_JWT_SECRET'),
      });

      // Validate payload structure (must have bankRef, not userId)
      const validated = this.bankAuthService.validateTicket(payload);
      (request as BankAuthenticatedRequest).bankUser = validated;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired bank ticket');
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['x-bank-ticket'] as string;
    if (authHeader) return authHeader;

    // Also accept Authorization: BankTicket <token>
    const auth = request.headers.authorization;
    if (!auth) return null;

    const [type, token] = auth.split(' ');
    if (type !== 'BankTicket' || !token) return null;

    return token;
  }
}

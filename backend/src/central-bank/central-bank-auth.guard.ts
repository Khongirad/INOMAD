import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CentralBankAuthService, CBTicketPayload } from './central-bank-auth.service';
import { Request } from 'express';

export interface CBAuthenticatedRequest extends Request {
  cbUser: CBTicketPayload;
}

export const CB_ROLES_KEY = 'cb_roles';
export const CentralBankRoles = (...roles: ('GOVERNOR' | 'BOARD_MEMBER')[]) =>
  SetMetadata(CB_ROLES_KEY, roles);

/**
 * Central Bank Auth Guard.
 *
 * Validates CB tickets (NOT auth JWTs or bank tickets).
 * Uses CB_JWT_SECRET — completely separate from all other secrets.
 * Supports role-based access via @CentralBankRoles decorator.
 */
@Injectable()
export class CentralBankAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private cbAuthService: CentralBankAuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing Central Bank authorization token');
    }

    try {
      const secret = this.configService.get<string>('CB_JWT_SECRET') || 'dev-cb-secret-change-me';
      const payload = this.jwtService.verify<CBTicketPayload>(token, { secret });

      // Validate payload structure
      const validated = this.cbAuthService.validateTicket(payload);
      (request as CBAuthenticatedRequest).cbUser = validated;

      // Check role-based access
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(CB_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(validated.role)) {
          throw new UnauthorizedException(
            `This action requires one of: ${requiredRoles.join(', ')}`,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired CB ticket');
    }
  }

  private extractToken(request: Request): string | null {
    // Header: x-cb-ticket
    const cbHeader = request.headers['x-cb-ticket'] as string;
    if (cbHeader) return cbHeader;

    // Authorization: CBTicket <token>
    const auth = request.headers.authorization;
    if (!auth) return null;

    const [type, token] = auth.split(' ');
    if (type !== 'CBTicket' || !token) return null;

    return token;
  }
}

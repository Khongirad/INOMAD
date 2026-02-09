import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('AUTH_JWT_SECRET or JWT_SECRET environment variable is required');
      }

      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Attach user payload to request
      request.user = payload;
    } catch (error) {
      if (error.message?.includes('environment variable')) {
        throw error; // Re-throw configuration errors
      }
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

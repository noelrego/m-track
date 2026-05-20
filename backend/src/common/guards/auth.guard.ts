import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { getAuthCookieName, getJwtTransport } from '../auth-token.config';
import type {
  AuthenticatedRequest,
  JwtPayload,
} from '../interfaces/auth.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const transport = getJwtTransport();
    const authorization = request.headers.authorization;

    if (transport === 'bearer' && authorization) {
      const [type, token] = authorization.split(' ');

      if (type?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    if (transport === 'cookie') {
      const cookies = request.cookies as Record<string, string | undefined> | undefined;
      const token = cookies?.[getAuthCookieName()];

      if (token) {
        return token;
      }
    }

    return undefined;
  }
}

import type { Request } from 'express';
import type { UserRole } from '../../schemas/auth.schema';

export interface JwtPayload {
  sub: string;
  username: string;
  emailId?: string;
  role?: UserRole;
  isRootAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

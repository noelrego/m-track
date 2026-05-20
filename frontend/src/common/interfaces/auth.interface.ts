import type { UserRole } from '../enums/auth.enum';

export interface LoginUser {
  username: string;
  emailId: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isRootAdmin: boolean;
}

export interface LoginResponse {
  user: LoginUser;
  token?: string;
}

export interface CurrentUserResponse {
  user: LoginUser;
}

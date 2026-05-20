export type AuthTransport = 'bearer' | 'cookie' | 'both';

export interface LoginResponse {
  accessToken?: string;
  tokenType: string;
  expiresIn: string;
  authTransport: AuthTransport;
}

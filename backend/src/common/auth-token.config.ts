import type { Response } from 'express';
import type { JwtTransport } from './interfaces/auth.interface';

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

export function getJwtTransport(): JwtTransport {
  const transport = process.env.JWT_TRANSPORT;

  if (transport === 'bearer' || transport === 'cookie') {
    return transport;
  }

  return 'cookie';
}

export function shouldUseBearer(): boolean {
  const transport = getJwtTransport();

  return transport === 'bearer';
}

export function shouldUseCookie(): boolean {
  const transport = getJwtTransport();

  return transport === 'cookie';
}

export function getAuthCookieName(): string {
  return process.env.JWT_COOKIE_NAME ?? 'm_track_access_token';
}

export function getAuthCookieOptions(): AuthCookieOptions {
  const sameSite = resolveSameSite(process.env.JWT_COOKIE_SAME_SITE);
  const cookieOptions: AuthCookieOptions = {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite,
    maxAge: Number(process.env.JWT_COOKIE_MAX_AGE_MS ?? 3_600_000),
    path: '/',
  };
  const domain = process.env.JWT_COOKIE_DOMAIN?.trim();

  if (domain) {
    cookieOptions.domain = domain;
  }

  return cookieOptions;
}

export function setAuthCookie(response: Response, token: string): void {
  response.cookie(getAuthCookieName(), token, getAuthCookieOptions());
}

export function clearAuthCookie(response: Response): void {
  const { maxAge: _maxAge, ...cookieOptions } = getAuthCookieOptions();

  response.clearCookie(getAuthCookieName(), {
    ...cookieOptions,
  });
}

function resolveSameSite(value: string | undefined): AuthCookieOptions['sameSite'] {
  if (value === 'strict' || value === 'none') {
    return value;
  }

  return 'lax';
}

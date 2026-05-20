import { getStoredAccessToken } from '../auth/auth-session';

type AuthTransport = 'bearer' | 'cookie' | 'both';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const apiPrefix = import.meta.env.VITE_API_PREFIX ?? 'api';
const authTransport = (import.meta.env.VITE_AUTH_TRANSPORT ?? 'cookie') as AuthTransport;

export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredAccessToken();

  if (shouldUseBearerOnClient() && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });
}

export function shouldUseBearerOnClient() {
  return authTransport === 'bearer' || authTransport === 'both';
}

export function getApiErrorMessage(data: unknown, fallback: string) {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

function buildApiUrl(path: string) {
  const baseUrl = apiUrl.replace(/\/+$/g, '');
  const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');
  const route = path.replace(/^\/+/g, '');

  return [baseUrl, prefix, route].filter(Boolean).join('/');
}

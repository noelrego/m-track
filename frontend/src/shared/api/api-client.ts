import { LOCAL_STORAGE_KEYS } from '../../common';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const apiPrefix = import.meta.env.VITE_API_PREFIX ?? 'api';

export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getStoredAuthToken();

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    credentials: 'omit',
    headers,
  });
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

export async function readApiBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildApiUrl(path: string) {
  const baseUrl = apiUrl.replace(/\/+$/g, '');
  const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');
  const route = path.replace(/^\/+/g, '');

  return [baseUrl, prefix, route].filter(Boolean).join('/');
}

function getStoredAuthToken() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
}
